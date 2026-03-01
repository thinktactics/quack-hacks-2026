"""Seed the database with demo users and waypoints."""

import os
from pathlib import Path
from typing import Any

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
        "explore": True,
    },
    {
        "username": "desert_astronomer",
        "api_id": "seed/az/lowell-observatory",
        "name": "Lowell Observatory",
        "lat": 35.2028,
        "lon": -111.6646,
        "explore": False,
    },
    {
        "username": "coastal_sketcher",
        "api_id": "seed/ca/santa-monica-pier",
        "name": "Santa Monica Pier",
        "lat": 34.0094,
        "lon": -118.4973,
        "explore": True,
    },
    {
        "username": "alpine_hiker",
        "api_id": "seed/chamonix/aiguille-midi",
        "name": "Aiguille du Midi Cable Car",
        "lat": 45.8789,
        "lon": 6.8872,
        "explore": False,
    },
]


def _api(client: FlaskClient, method: str, path: str, payload: dict | None = None) -> dict[str, Any]:
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


def seed() -> None:
    setup_logging()
    _wipe_sqlite()

    from backend.app import SessionLocal, create_app

    app = create_app()
    _reset(SessionLocal)

    with app.test_client() as client:
        for p in PROFILES:
            # Create user (no root yet)
            user = _api(client, "POST", "/api/user", {"username": p["username"], "lat": p["lat"], "lon": p["lon"]})

            # Create root waypoint
            root = _api(client, "POST", "/api/waypoint", {"api_id": p["api_id"], "lat": p["lat"], "lon": p["lon"], "name": p["name"]})

            # Assign root to user
            _api(client, "PATCH", f"/api/user/{user['id']}/root", {"root_waypoint_id": root["id"]})

            # Mark root visited
            _api(client, "PATCH", f"/api/waypoint/{root['id']}/visited", {"visited": True})

            # Optionally discover and attach children via OSM
            if p["explore"]:
                children = _api(client, "POST", "/api/waypoint/osm", {"lat": p["lat"], "lon": p["lon"], "num": 3})
                child_ids = [w["id"] for w in children]
                _api(client, "PATCH", f"/api/waypoint/{root['id']}/children", {"child_ids": child_ids})

            tree = _api(client, "GET", f"/api/waypoint/tree/{user['id']}")
            node_count = 1 + len(tree.get("children", []))
            logger.success(f"Seeded {p['username']} — root={root['id']} explored={p['explore']} nodes={node_count}")

    logger.success("Seed complete.")


if __name__ == "__main__":
    seed()
