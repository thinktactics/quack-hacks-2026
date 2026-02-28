"""Seed script: populates test users and waypoints via the Flask API.

Run with the Flask server already running:
    python -m backend.services.seed
"""

import random
import sys

import requests

from backend.services.osm import query_nearby

BASE_URL = "http://localhost:5000"

# (lat, lon, label) for each tree user's starting area
TREE_CENTERS = [
    (40.7440, -74.0324, "Hoboken, NJ"),
    (37.7749, -122.4194, "San Francisco"),
    (41.8781, -87.6298, "Chicago"),
]


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def _post(path: str, data: dict | None = None) -> dict:
    r = requests.post(f"{BASE_URL}{path}", json=data or {}, timeout=15)
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------


def create_waypoint(loc: dict) -> dict:
    return _post(
        "/api/waypoint",
        {
            "lat": loc["lat"],
            "lon": loc["lon"],
            "name": loc["name"],
            "api_id": loc["id"],
        },
    )


def link_child(parent_id: int, child_id: int) -> None:
    requests.post(
        f"{BASE_URL}/api/waypoint/{parent_id}/children/{child_id}", timeout=15
    ).raise_for_status()


def create_user(username: str, password: str, root_id: int) -> dict:
    return _post(
        "/api/user",
        {
            "username": username,
            "password": password,
            "root_waypoint_id": root_id,
        },
    )


# ---------------------------------------------------------------------------
# Tree builder
# ---------------------------------------------------------------------------


def build_tree(
    center_lat: float,
    center_lon: float,
    target_size: int = 10,
) -> tuple[dict, list[dict]]:
    """Create a waypoint tree rooted near (center_lat, center_lon).

    The root is seeded with query_nearby(..., limit=1). Each subsequent node
    expands with a random 1-3 children drawn from query_nearby around that
    node, stopping once target_size total waypoints have been created.
    """
    root_locs = query_nearby(center_lat, center_lon, 300, 1)
    if not root_locs:
        raise RuntimeError(f"No OSM results near ({center_lat}, {center_lon})")

    root_wp = create_waypoint(root_locs[0])
    all_waypoints: list[dict] = [root_wp]
    used_api_ids: set[str] = {root_wp["api_id"]}
    frontier: list[dict] = [root_wp]

    while len(all_waypoints) < target_size and frontier:
        parent_wp = frontier.pop(0)
        remaining = target_size - len(all_waypoints)
        num_children = min(random.randint(1, 3), remaining)

        # Fetch a few extra candidates so we have room to skip duplicates
        nearby = query_nearby(parent_wp["lat"], parent_wp["lon"], 300, num_children + 5)
        candidates = [loc for loc in nearby if loc["id"] not in used_api_ids][:num_children]

        for loc in candidates:
            child_wp = create_waypoint(loc)
            link_child(parent_wp["id"], child_wp["id"])
            all_waypoints.append(child_wp)
            used_api_ids.add(child_wp["api_id"])
            if len(all_waypoints) < target_size:
                frontier.append(child_wp)

    return root_wp, all_waypoints


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------


def seed() -> None:
    random.seed(42)

    # 1. Users with rich waypoint trees (~10 nodes each)
    tree_users = [
        ("alice", "password123", *TREE_CENTERS[0]),
        ("bob",   "password123", *TREE_CENTERS[1]),
        ("carol", "password123", *TREE_CENTERS[2]),
    ]

    for username, password, lat, lon, label in tree_users:
        print(f"\n[tree] {username} — {label} ({lat}, {lon})")
        root_wp, all_wps = build_tree(lat, lon, target_size=10)
        user = create_user(username, password, root_wp["id"])
        print(
            f"  user_id={user['id']}  waypoints={len(all_wps)}"
            f"  root_waypoint_id={root_wp['id']}"
        )

    # 2. User with only a root waypoint (no children)
    print("\n[root-only] dave — London (51.5074, -0.1278)")
    london_locs = query_nearby(51.5074, -0.1278, 300, 1)
    if not london_locs:
        raise RuntimeError("No OSM results near London")
    root_wp = create_waypoint(london_locs[0])
    dave = create_user("dave", "password123", root_wp["id"])
    print(f"  user_id={dave['id']}  root_waypoint_id={root_wp['id']}  children=[]")

    # 3. User with no waypoints
    # NOTE: root_waypoint_id is non-nullable in the current schema, so a
    # minimal placeholder root is created. It has no children and is otherwise
    # unused — the user effectively has no meaningful waypoint tree.
    print("\n[no-waypoints] eve — Tokyo (35.6762, 139.6503)")
    tokyo_locs = query_nearby(35.6762, 139.6503, 300, 1)
    if not tokyo_locs:
        raise RuntimeError("No OSM results near Tokyo")
    placeholder_root = create_waypoint(tokyo_locs[0])
    eve = create_user("eve", "password123", placeholder_root["id"])
    print(f"  user_id={eve['id']}  root_waypoint_id={placeholder_root['id']}  (placeholder only)")

    print("\nSeed complete.")


if __name__ == "__main__":
    try:
        seed()
    except requests.HTTPError as exc:
        print(f"\nHTTP error: {exc.response.status_code} {exc.response.text}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        sys.exit(1)
