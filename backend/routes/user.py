"""User API routes."""

from flask import Blueprint, g, jsonify, request, Response
from loguru import logger

from backend.db.user_queries import (
    create_user as create_user_query,
    get_user as get_user_query,
    get_user_by_username as get_user_by_username_query,
    list_users as list_users_query,
    set_user_root as set_user_root_query,
)
from backend.services.osm import search_address

user_bp = Blueprint("user", __name__, url_prefix="/api/user")


# GET /api/user
@user_bp.route("", methods=["GET"])
def list_users() -> tuple[Response, int]:
    """Return all users."""
    users = list_users_query(g.db)
    return jsonify([user.to_dict() for user in users]), 200


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

    if get_user_by_username_query(g.db, str(username)) is not None:
        return jsonify({"error": "username already exists"}), 409

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


# GET /api/user/address-search?q=<query>&limit=<n>
@user_bp.route("/address-search", methods=["GET"])
def address_search() -> tuple[Response, int]:
    """Return geocoded address suggestions from Photon."""
    query = request.args.get("q", "").strip()
    limit_str = request.args.get("limit", "5")
    if not query:
        return jsonify({"error": "q is required"}), 400

    try:
        limit = max(1, min(int(limit_str), 10))
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400

    try:
        results = search_address(query, limit=limit)
    except Exception:
        logger.exception("Address search failed")
        return jsonify({"error": "address search failed"}), 502

    return jsonify(results), 200


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
