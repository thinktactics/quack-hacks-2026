"""Seed the database with demo users and waypoints."""

import os
import random
from pathlib import Path
from typing import Any, cast

from flask.testing import FlaskClient
from loguru import logger

from backend.logging_config import setup_logging
from backend.models.user import User
from backend.models.waypoint import Waypoint

PROFILES = [
    {
        "username": "city_runner",
        "api_id": "seed/nyc/times-square",
        "name": "Times Square",
        "lat": 40.758896,
        "lon": -73.985130,
        "explore_depth": 2,
    },
    {
        "username": "desert_astronomer",
        "api_id": "seed/az/lowell-observatory",
        "name": "Lowell Observatory",
        "lat": 35.2028,
        "lon": -111.6646,
        "explore_depth": 0,
    },
    {
        "username": "hacker",
        "api_id": "seed/nj/castle-point-terrace",
        "name": "1 Castle Point Terrace",
        "lat": 40.7453,
        "lon": -74.0247,
        "explore_depth": 0,
    },
]

ROOT_TARGET = 4   # children for the root waypoint
CHILD_TARGET = (1, 2)  # random range for all other waypoints


def _api(
    client: FlaskClient, method: str, path: str, payload: dict | None = None
) -> dict[str, Any] | list[Any]:
    response = client.open(path=path, method=method, json=payload)
    data = response.get_json(silent=True) or {}
    if response.status_code >= 400:
        raise RuntimeError(f"{method} {path} → {response.status_code}: {data}")
    return data


def _reset(session_local: Any) -> None:
    session = session_local()
    try:
        session.query(User).delete()
        session.query(Waypoint).delete()
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _wipe_sqlite() -> None:
    url = os.getenv("DATABASE_URL", "sqlite:///branch.db")
    if not url.startswith("sqlite:///"):
        return
    path = Path(url.removeprefix("sqlite:///"))
    if not path.is_absolute():
        path = Path.cwd() / path
    if path.exists():
        path.unlink()
        logger.info(f"Deleted {path}")


def _explore(
    client: FlaskClient,
    waypoint_id: int,
    lat: float,
    lon: float,
    depth: int,
    seen_api_ids: set[str],
    seen_names: set[str],
    target: int = ROOT_TARGET,
) -> int:
    """Mark waypoint visited, discover nearby POIs, attach up to target as children.

    Recurses depth-1 for each child. Returns total nodes added (children + descendants).
    """
    if depth == 0:
        return 0

    _api(client, "PATCH", f"/api/waypoint/{waypoint_id}/visited", {"visited": True})

    pool = cast(
        list[dict[str, Any]],
        _api(client, "POST", "/api/waypoint/osm", {"lat": lat, "lon": lon, "num": target}),
    )

    fresh = [
        w for w in pool
        if w.get("api_id") not in seen_api_ids and w["name"] not in seen_names
    ]
    children = fresh[:target]

    if not children:
        return 0

    for w in children:
        if w.get("api_id"):
            seen_api_ids.add(w["api_id"])
        seen_names.add(w["name"])

    _api(
        client,
        "PATCH",
        f"/api/waypoint/{waypoint_id}/children",
        {"child_ids": [w["id"] for w in children]},
    )

    total = len(children)
    for child in children:
        total += _explore(
            client, child["id"], child["lat"], child["lon"],
            depth - 1, seen_api_ids, seen_names,
            target=random.randint(*CHILD_TARGET),
        )
    return total


def seed() -> None:
    setup_logging()
    _wipe_sqlite()

    from backend.app import SessionLocal, create_app

    app = create_app()
    _reset(SessionLocal)

    with app.test_client() as client:
        for p in PROFILES:
            # Create user
            user = cast(
                dict[str, Any],
                _api(
                    client,
                    "POST",
                    "/api/user",
                    {"username": p["username"], "lat": p["lat"], "lon": p["lon"]},
                ),
            )

            # Create root waypoint
            root = cast(
                dict[str, Any],
                _api(
                    client,
                    "POST",
                    "/api/waypoint",
                    {
                        "api_id": p["api_id"],
                        "lat": p["lat"],
                        "lon": p["lon"],
                        "name": p["name"],
                    },
                ),
            )

            # Assign root to user
            _api(
                client,
                "PATCH",
                f"/api/user/{user['id']}/root",
                {"root_waypoint_id": root["id"]},
            )

            depth = p["explore_depth"]
            node_count = 1
            if depth > 0:
                seen_api_ids = {p["api_id"]}
                seen_names = {p["name"]}
                node_count += _explore(
                    client, root["id"], p["lat"], p["lon"],
                    depth, seen_api_ids, seen_names,
                )

            logger.success(
                f"Seeded {p['username']} — root={root['id']} depth={depth} nodes={node_count}"
            )

    logger.success("Seed complete.")


if __name__ == "__main__":
    seed()
