"""Waypoint API routes."""

from flask import Blueprint, g, jsonify, request, Response
from loguru import logger

from backend.db.waypoint_queries import (
    add_children_to_waypoint,
    create_waypoint,
    get_waypoint as get_waypoint_query,
    get_waypoint_tree_for_user,
    set_waypoint_visited,
)
from backend.services.osm import query_nearby

waypoint_bp = Blueprint("waypoint", __name__, url_prefix="/api/waypoint")


# GET /api/waypoint/<id>
@waypoint_bp.route("/<int:waypoint_id>", methods=["GET"])
def get_waypoint(waypoint_id: int) -> tuple[Response, int]:
    """Return one waypoint by ID."""
    waypoint = get_waypoint_query(g.db, waypoint_id)
    if not waypoint:
        return jsonify({"error": "Waypoint not found"}), 404
    return jsonify(waypoint.to_dict()), 200


# GET /api/waypoint/tree/<user_id>
@waypoint_bp.route("/tree/<int:user_id>", methods=["GET"])
def get_tree_by_user(user_id: int) -> tuple[Response, int]:
    """Return the full waypoint tree for a user."""
    tree = get_waypoint_tree_for_user(g.db, user_id)
    if tree is None:
        return jsonify({"error": "User or root waypoint not found"}), 404
    return jsonify(tree), 200


# PATCH /api/waypoint/<id>/visited
@waypoint_bp.route("/<int:waypoint_id>/visited", methods=["PATCH"])
def set_visited(waypoint_id: int) -> tuple[Response, int]:
    """Update visited status for one waypoint."""
    payload = request.get_json(silent=True) or {}
    visited = bool(payload.get("visited", True))
    waypoint = set_waypoint_visited(g.db, waypoint_id, visited)
    if not waypoint:
        return jsonify({"error": "Waypoint not found"}), 404
    logger.info(
        f"Waypoint {waypoint_id} marked as {'visited' if visited else 'unvisited'}"
    )
    return jsonify(waypoint.to_dict()), 200


# POST /api/waypoint
@waypoint_bp.route("", methods=["POST"])
def create_single_waypoint() -> tuple[Response, int]:
    """Create a single waypoint."""
    payload = request.get_json(silent=True) or {}
    lat = payload.get("lat")
    lon = payload.get("lon")
    name = payload.get("name")
    api_id = payload.get("api_id", None)

    if lat is None or lon is None or name is None or api_id is None:
        return jsonify({"error": "lat, lon, name, and api_id are required"}), 400

    waypoint = create_waypoint(g.db, api_id, lat, lon, name)
    return jsonify(waypoint.to_dict()), 201


# PATCH /api/waypoint/<id>/children
@waypoint_bp.route("/<int:waypoint_id>/children", methods=["PATCH"])
def add_children(waypoint_id: int) -> tuple[Response, int]:
    """Add children to a waypoint."""
    payload = request.get_json(silent=True) or {}
    child_ids = payload.get("child_ids")

    if child_ids is None or not isinstance(child_ids, list):
        return jsonify({"error": "child_ids must be a list"}), 400

    add_children_to_waypoint(g.db, waypoint_id, child_ids)
    waypoint = get_waypoint_query(g.db, waypoint_id)
    if not waypoint:
        return jsonify({"error": "Waypoint not found"}), 404
    logger.info(f"Added {len(child_ids)} children to waypoint {waypoint_id}")
    return jsonify(waypoint.to_dict()), 200


# POST /api/waypoint/osm
@waypoint_bp.route("/osm", methods=["POST"])
def create_from_osm() -> tuple[Response, int]:
    """Query OSM for nearby POIs and create waypoints from the results."""
    payload = request.get_json(silent=True) or {}
    lat = payload.get("lat")
    lon = payload.get("lon")

    if lat is None or lon is None:
        return jsonify({"error": "lat and lon are required"}), 400

    num = payload.get("num", 10)

    results = query_nearby(lat, lon, limit=num)

    created = []
    for r in results:
        waypoint = create_waypoint(
            g.db, api_id=str(r["id"]), lat=r["lat"], lon=r["lon"], name=r["name"]
        )
        created.append(waypoint.to_dict())

    logger.info(
        f"Created {len(created)} waypoints from OSM query at ({lat:.4f}, {lon:.4f})"
    )
    return jsonify(created), 201
