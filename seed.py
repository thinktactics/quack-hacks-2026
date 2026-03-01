"""Route-driven database seeding for realistic multi-user scenarios."""

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Any

from flask.testing import FlaskClient
from loguru import logger

from backend.db.waypoint_queries import create_waypoint
from backend.logging_config import setup_logging
from backend.models.user import User
from backend.models.waypoint import Waypoint


@dataclass(frozen=True)
class SeedProfile:
    """Scenario definition for one seeded user journey."""

    username: str
    root_api_id: str
    root_name: str
    lat: float
    lon: float
    expand_one_child: bool


def _count_nodes(tree: dict[str, Any]) -> int:
    """Count nodes in a nested waypoint tree payload."""
    return 1 + sum(_count_nodes(child) for child in tree.get("children", []))


def _api_call(
    client: FlaskClient,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Execute one API call and return parsed JSON response."""
    response = client.open(path=path, method=method, json=payload)
    data = response.get_json(silent=True) or {}
    if response.status_code >= 400:
        raise RuntimeError(f"{method} {path} failed ({response.status_code}): {data}")
    return data


def _reset_database(session_local: Any) -> None:
    """Clear all users and waypoints for deterministic seeding."""
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


def _recreate_sqlite_db_file_if_needed() -> None:
    """Delete local SQLite DB file if it exists so schema is recreated from scratch."""
    database_url = os.getenv("DATABASE_URL", "sqlite:///branch.db")
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        logger.warning(
            "Skipping DB file deletion: DATABASE_URL is not a sqlite file URL."
        )
        return

    db_path = Path(database_url.removeprefix(prefix))
    if not db_path.is_absolute():
        db_path = Path.cwd() / db_path

    if db_path.exists():
        db_path.unlink()
        logger.info(f"Deleted existing sqlite database file: {db_path}")
    else:
        logger.info(f"No existing sqlite database file found at: {db_path}")


def _bootstrap_roots(profiles: list[SeedProfile], session_local: Any) -> dict[str, int]:
    """Create root waypoints used by user-creation API calls."""
    session = session_local()
    root_ids: dict[str, int] = {}
    try:
        for profile in profiles:
            root = create_waypoint(
                session=session,
                api_id=profile.root_api_id,
                lat=profile.lat,
                lon=profile.lon,
                name=profile.root_name,
            )
            root_ids[profile.username] = root.id
            logger.info(
                f"Bootstrapped root waypoint {root.id} for {profile.username}: {profile.root_name}"
            )
    finally:
        session.close()
    return root_ids


def seed_database() -> None:
    """Seed distinct users by exercising API routes in logical order."""
    setup_logging()
    _recreate_sqlite_db_file_if_needed()

    from backend.app import SessionLocal, create_app

    app = create_app()

    profiles = [
        SeedProfile(
            username="city_runner",
            root_api_id="seed/nyc/times-square",
            root_name="Times Square",
            lat=40.758896,
            lon=-73.985130,
            expand_one_child=True,
        ),
        SeedProfile(
            username="desert_astronomer",
            root_api_id="seed/az/lowell-observatory",
            root_name="Lowell Observatory",
            lat=35.2028,
            lon=-111.6646,
            expand_one_child=False,
        ),
        SeedProfile(
            username="coastal_sketcher",
            root_api_id="seed/ca/santa-monica-pier",
            root_name="Santa Monica Pier",
            lat=34.0094,
            lon=-118.4973,
            expand_one_child=True,
        ),
        SeedProfile(
            username="alpine_hiker",
            root_api_id="seed/chamonix/aiguille-midi",
            root_name="Aiguille du Midi Cable Car",
            lat=45.8789,
            lon=6.8872,
            expand_one_child=False,
        ),
    ]

    _reset_database(SessionLocal)
    root_ids = _bootstrap_roots(profiles, SessionLocal)

    with app.test_client() as client:
        logger.info("Starting route-based seed flow")

        for profile in profiles:
            root_id = root_ids[profile.username]

            created_user = _api_call(
                client,
                "POST",
                "/api/user",
                {
                    "username": profile.username,
                    "lat": profile.lat,
                    "lon": profile.lon,
                    "root_waypoint_id": root_id,
                },
            )
            user_id = int(created_user["id"])

            _api_call(client, "GET", f"/api/user/{user_id}")
            _api_call(client, "GET", f"/api/waypoint/{root_id}")

            visited_root = _api_call(
                client,
                "PATCH",
                f"/api/waypoint/{root_id}/visited",
                {"visited": True},
            )
            root_children: list[int] = visited_root.get("children", [])

            if profile.expand_one_child and root_children:
                _api_call(
                    client,
                    "PATCH",
                    f"/api/waypoint/{root_children[0]}/visited",
                    {"visited": True},
                )

            tree = _api_call(client, "GET", f"/api/waypoint/tree/{user_id}")
            logger.success(
                f"Seeded user={profile.username} user_id={user_id} root_id={root_id} "
                f"children={len(root_children)} tree_nodes={_count_nodes(tree)}"
            )

    logger.success("Route-driven seed completed for all user scenarios.")


if __name__ == "__main__":
    seed_database()
