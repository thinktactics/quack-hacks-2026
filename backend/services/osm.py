"""Overpass/Nominatim API calls."""

import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def query_nearby(
    lat: float,
    lon: float,
    rad: float = 500.0,
    limit: int = 10,
) -> list[dict]:
    """
    Return up to `limit` named OSM locations within `rad` metres of (lat, lon).

    Each result dict has:
        id    – "<type>/<osm_id>"  e.g. "node/123456"
        name  – display name from OSM tags
        lat   – latitude  (float)
        lon   – longitude (float)
    """
    # Filter to actual visitable POIs by requiring one of these OSM tags.
    # This excludes streets, neighborhoods, transit stops, and other non-place features.
    poi_filters = [
        '["amenity"]',
        '["shop"]',
        '["tourism"]',
        '["leisure"]',
        '["historic"]',
    ]
    node_lines = "\n".join(
        f'  node["name"]{f}(around:{rad},{lat},{lon});' for f in poi_filters
    )
    way_lines = "\n".join(
        f'  way["name"]{f}(around:{rad},{lat},{lon});' for f in poi_filters
    )
    query = f"""
[out:json][timeout:25];
(
{node_lines}
{way_lines}
);
out center {limit};
"""
    response = requests.post(OVERPASS_URL, data={"data": query}, timeout=30)
    response.raise_for_status()

    elements = response.json().get("elements", [])
    results: list[dict] = []

    for el in elements:
        el_type = el.get("type")
        osm_id = el.get("id")
        tags = el.get("tags", {})
        name = tags.get("name")

        if not name:
            continue

        # Nodes have lat/lon directly; ways expose a "center" object
        if el_type == "node":
            el_lat = el.get("lat")
            el_lon = el.get("lon")
        elif el_type == "way":
            center = el.get("center", {})
            el_lat = center.get("lat")
            el_lon = center.get("lon")
        else:
            continue

        if el_lat is None or el_lon is None:
            continue

        results.append(
            {
                "id": f"{el_type}/{osm_id}",
                "name": name,
                "lat": el_lat,
                "lon": el_lon,
            }
        )

    return results[:limit]
