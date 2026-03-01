"""User API routes."""

from flask import Blueprint, g, jsonify, request, Response
from loguru import logger

from backend.db.user_queries import (
    create_user as create_user_query,
    get_user as get_user_query,
    set_user_root as set_user_root_query,
)

user_bp = Blueprint("user", __name__, url_prefix="/api/user")


# GET /api/user/<id>
@user_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id: int) -> tuple[Response, int]:
    """Return one user by ID."""
    user = get_user_query(g.db, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


# POST /api/user
@user_bp.route("", methods=["POST"])
def create_user() -> tuple[Response, int]:
    """Create a user from request payload."""
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    lat = payload.get("lat")
    lon = payload.get("lon")
    root_waypoint_id = payload.get("root_waypoint_id")

    if not username or lat is None or lon is None:
        return (
            jsonify({"error": "username, lat, and lon are required"}),
            400,
        )

    user = create_user_query(
        g.db,
        username=str(username),
        lat=float(lat),
        lon=float(lon),
        root_waypoint_id=(
            int(root_waypoint_id) if root_waypoint_id is not None else None
        ),
    )
    logger.info(f"Created user '{username}' (id={user.id}) at ({lat:.4f}, {lon:.4f})")
    return jsonify(user.to_dict()), 201


# PATCH /api/user/<id>/root
@user_bp.route("/<int:user_id>/root", methods=["PATCH"])
def set_user_root(user_id: int) -> tuple[Response, int]:
    """Assign a root waypoint to a user."""
    payload = request.get_json(silent=True) or {}
    root_waypoint_id = payload.get("root_waypoint_id")

    if root_waypoint_id is None:
        return jsonify({"error": "root_waypoint_id is required"}), 400

    user = set_user_root_query(g.db, user_id, int(root_waypoint_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    logger.info(f"User {user_id} assigned root waypoint {root_waypoint_id}")
    return jsonify(user.to_dict()), 200
