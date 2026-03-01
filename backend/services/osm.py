"""Photon API calls for POI discovery."""

import math
import random
from typing import Any
import requests
from loguru import logger
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    RetryError,
    RetryCallState,
)

PHOTON_URL = "https://photon.komoot.io/api/"
HEADERS = {"User-Agent": "BR@NCH/1.0 (Skill Tree Explorer)"}

PER_CATEGORY_LIMIT = 5  # Request many results per category

POI_CATEGORIES = ["restaurant", "park", "museum", "cafe", "shop", "attraction",
                    "natural", "tourism", "historic", "leisure", ]


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance in meters between two lat/lon points using Haversine formula.

    Parameters
    ----------
    lat1, lon1 : float
        First point coordinates.
    lat2, lon2 : float
        Second point coordinates.

    Returns
    -------
    float
        Distance in meters.
    """
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def _should_retry(retry_state: RetryCallState) -> bool:
    """Only retry on server errors (5xx) and network issues, not client errors (4xx)."""
    if retry_state.outcome is None:
        return True
    exception = retry_state.outcome.exception()
    if exception is None:
        return False
    if isinstance(exception, requests.HTTPError):
        if exception.response is not None:
            return exception.response.status_code >= 500
    return isinstance(exception, requests.RequestException)


@retry(
    stop=stop_after_attempt(7),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    retry=_should_retry,
    before_sleep=lambda retry_state: logger.debug(
        f"Retry {retry_state.attempt_number}/7 after "
        f"{retry_state.outcome.exception() if retry_state.outcome else 'unknown error'}"
    ),
)
def _fetch_category(params: dict[str, Any]) -> list[dict]:
    """
    Fetch POI features for a single category with retry logic.

    Parameters
    ----------
    params : dict[str, Any]
        Query parameters for Photon API.

    Returns
    -------
    list[dict]
        GeoJSON features from Photon response.

    Raises
    ------
    requests.RequestException
        If request fails after all retry attempts.
    """
    response = requests.get(PHOTON_URL, params=params, headers=HEADERS, timeout=10)
    response.raise_for_status()
    return response.json().get("features", [])


def query_nearby(
    lat: float,
    lon: float,
    limit: int = 10,
    radius: int = 500,
) -> list[dict[str, Any]]:
    """
    Return up to `limit` closest named POI locations near (lat, lon).

    Queries multiple POI categories (restaurants, parks, museums, cafes, shops,
    attractions), calculates distances, and returns the closest POIs across all
    categories, deduplicated by OSM ID.

    Parameters
    ----------
    lat : float
        Latitude of search center.
    lon : float
        Longitude of search center.
    limit : int, optional
        Maximum number of results to return (default: 10).
    radius : int, optional
        Initial search radius in meters (default: 500). Doubles up to 32 km if
        too few results are found.

    Returns
    -------
    list[dict[str, Any]]
        List of POI dicts, each containing:
            id   : str – "<type>/<osm_id>" (e.g., "node/123456")
            name : str – Display name
            lat  : float – Latitude
            lon  : float – Longitude
        Sorted by distance from search center (closest first).

    Raises
    ------
    requests.HTTPError
        If any API request fails.
    """
    MAX_RADIUS = 32_000  # 32 km hard cap
    seen_ids: set[str] = set()
    results: list[dict[str, Any]] = []
    current_radius = radius

    while True:
        logger.info(
            f"Querying POIs near ({lat:.4f}, {lon:.4f}), limit={limit}, radius={current_radius}m"
        )
        zoom = max(1, round(16 - math.log2(max(current_radius, 500) / 500)))

        for category in POI_CATEGORIES:
            params = {
                "q": category,
                "lat": lat,
                "lon": lon,
                "limit": PER_CATEGORY_LIMIT,
                "zoom": zoom,
            }

            try:
                features = _fetch_category(params)
                category_count = 0

                for feature in features:
                    props = feature.get("properties", {})
                    geom = feature.get("geometry", {})
                    coords = geom.get("coordinates", [])

                    if len(coords) != 2:
                        continue

                    osm_type = props.get("osm_type")
                    osm_id = props.get("osm_id")
                    name = props.get("name")

                    if not all([osm_type, osm_id, name]):
                        continue

                    poi_id = f"{osm_type}/{osm_id}"
                    if poi_id in seen_ids:
                        continue

                    poi_lat = coords[1]
                    poi_lon = coords[0]
                    distance = _haversine_distance(lat, lon, poi_lat, poi_lon)

                    if distance > current_radius:
                        continue

                    seen_ids.add(poi_id)
                    results.append(
                        {
                            "id": poi_id,
                            "name": name,
                            "lat": poi_lat,
                            "lon": poi_lon,
                            "distance": distance,
                            "category": category,
                        }
                    )
                    category_count += 1

                if category_count > 0:
                    logger.info(f"  {category}: found {category_count} POIs")

            except (requests.RequestException, RetryError) as e:
                error_msg = (
                    str(e.last_attempt.exception())
                    if isinstance(e, RetryError)
                    else str(e)
                )
                logger.warning(
                    f"  {category}: request failed ({type(e).__name__}: {error_msg})"
                )
                continue

        if len(results) >= limit or current_radius >= MAX_RADIUS:
            break

        next_radius = min(current_radius * 2, MAX_RADIUS)
        logger.info(
            f"Only {len(results)} results at {current_radius}m, retrying at {next_radius}m"
        )
        current_radius = next_radius

    # Randomly select up to limit results
    sample = random.sample(results, min(limit, len(results)))
    final_results = [
        {
            "id": poi["id"],
            "name": poi["name"],
            "lat": poi["lat"],
            "lon": poi["lon"],
            "category": poi["category"],
        }
        for poi in sample
    ]

    logger.info(
        f"Returning {len(final_results)} closest POIs from {len(results)} total found"
    )
    return final_results
