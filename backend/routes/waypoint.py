from flask import Blueprint, g, jsonify, request

from backend.db.waypoint_queries import (
    add_child as add_child_query,
    create_waypoint as create_waypoint_query,
    get_children as get_children_query,
    get_children_for_user_waypoint,
    get_waypoint as get_waypoint_query,
    get_waypoint_tree_for_user,
    set_waypoint_visited,
)

waypoint_bp = Blueprint("waypoint", __name__, url_prefix="/api/waypoint")


# GET /api/waypoint/<id>
@waypoint_bp.route("/<int:waypoint_id>", methods=["GET"])
def get_waypoint(waypoint_id: int):
    waypoint = get_waypoint_query(g.db, waypoint_id)
    if not waypoint:
        return jsonify({"error": "Waypoint not found"}), 404
    return jsonify(waypoint.to_dict()), 200


# GET /api/waypoint/<id>/children
@waypoint_bp.route("/<int:waypoint_id>/children", methods=["GET"])
def get_children(waypoint_id: int):
    children = get_children_query(g.db, waypoint_id)
    return jsonify([child.to_dict() for child in children]), 200


# POST /api/waypoint
@waypoint_bp.route("", methods=["POST"])
def create_waypoint():
    payload = request.get_json(silent=True) or {}
    lat = payload.get("lat")
    lon = payload.get("lon")
    name = payload.get("name")

    if lat is None or lon is None or not name:
        return jsonify({"error": "lat, lon, name are required"}), 400

    waypoint = create_waypoint_query(
        g.db,
        lat=float(lat),
        lon=float(lon),
        name=str(name),
        api_id=payload.get("api_id"),
        children=payload.get("children") or [],
    )
    return jsonify(waypoint.to_dict()), 201


# POST /api/waypoint/<id>/children/<child_id>
@waypoint_bp.route("/<int:waypoint_id>/children/<int:child_id>", methods=["POST"])
def add_child(waypoint_id: int, child_id: int):
    waypoint = add_child_query(g.db, waypoint_id, child_id)
    if not waypoint:
        return jsonify({"error": "Waypoint not found"}), 404
    return jsonify(waypoint.to_dict()), 200


# GET /api/waypoint/user/<user_id>/tree
@waypoint_bp.route("/user/<int:user_id>/tree", methods=["GET"])
def get_tree_by_user(user_id: int):
    tree = get_waypoint_tree_for_user(g.db, user_id)
    if tree is None:
        return jsonify({"error": "User or root waypoint not found"}), 404
    return jsonify(tree), 200


# GET /api/waypoint/user/<user_id>/waypoint/<waypoint_id>/children
@waypoint_bp.route(
    "/user/<int:user_id>/waypoint/<int:waypoint_id>/children", methods=["GET"]
)
def get_children_for_user(user_id: int, waypoint_id: int):
    children = get_children_for_user_waypoint(g.db, user_id, waypoint_id)
    if children is None:
        return jsonify({"error": "Waypoint not in user tree or user not found"}), 404
    return jsonify([child.to_dict() for child in children]), 200


# PATCH /api/waypoint/<id>/visited
@waypoint_bp.route("/<int:waypoint_id>/visited", methods=["PATCH"])
def set_visited(waypoint_id: int):
    payload = request.get_json(silent=True) or {}
    visited = bool(payload.get("visited", True))
    waypoint = set_waypoint_visited(g.db, waypoint_id, visited)
    if not waypoint:
        return jsonify({"error": "Waypoint not found"}), 404
    return jsonify(waypoint.to_dict()), 200
