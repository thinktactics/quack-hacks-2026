"""Waypoint API routes."""

from flask import Blueprint, g, jsonify, request, Response

from backend.db.waypoint_queries import (
    get_waypoint as get_waypoint_query,
    get_waypoint_tree_for_user,
    set_waypoint_visited,
)

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
@waypoint_bp.route("/waypoint/tree/<int:user_id>", methods=["GET"])
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
    return jsonify(waypoint.to_dict()), 200
