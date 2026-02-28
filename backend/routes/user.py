"""User API routes."""

from flask import Blueprint, g, jsonify, request, Response

from backend.db.user_queries import (
    create_user as create_user_query,
    get_user as get_user_query,
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
    root_waypoint_id = payload.get("root_waypoint_id")

    if not username or root_waypoint_id is None:
        return (
            jsonify({"error": "username and root_waypoint_id are required"}),
            400,
        )

    user = create_user_query(
        g.db,
        username=str(username),
        root_waypoint_id=int(root_waypoint_id),
    )
    return jsonify(user.to_dict()), 201
