from flask import Blueprint, g, jsonify, request

from backend.db.user_queries import (
    create_user as create_user_query,
    delete_user as delete_user_query,
    get_root_waypoint_for_user,
    get_user as get_user_query,
)

user_bp = Blueprint("user", __name__, url_prefix="/api/user")


# GET /api/user/<id>
@user_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id: int):
    user = get_user_query(g.db, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


# POST /api/user
@user_bp.route("", methods=["POST"])
def create_user():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    password = payload.get("password")
    root_waypoint_id = payload.get("root_waypoint_id")

    if not username or not password or root_waypoint_id is None:
        return (
            jsonify({"error": "username, password, root_waypoint_id are required"}),
            400,
        )

    user = create_user_query(
        g.db,
        username=str(username),
        password=str(password),
        root_waypoint_id=int(root_waypoint_id),
    )
    return jsonify(user.to_dict()), 201


# GET /api/user/<id>/root
@user_bp.route("/<int:user_id>/root", methods=["GET"])
def get_root_waypoint_by_user(user_id: int):
    root = get_root_waypoint_for_user(g.db, user_id)
    if not root:
        return jsonify({"error": "User or root waypoint not found"}), 404
    return jsonify(root.to_dict()), 200


# GET /api/user/<id>/root/<root_id>
@user_bp.route("/<int:user_id>/root/<int:root_id>", methods=["GET"])
def get_root_by_id_and_user(user_id: int, root_id: int):
    root = get_root_waypoint_for_user(g.db, user_id)
    if not root:
        return jsonify({"error": "User or root waypoint not found"}), 404
    if root.id != root_id:
        return jsonify({"error": "Root waypoint does not match user"}), 400
    return jsonify(root.to_dict()), 200


# DELETE /api/user/<id>
@user_bp.route("/<int:user_id>", methods=["DELETE"])
def delete_user(user_id: int):
    deleted = delete_user_query(g.db, user_id)
    if not deleted:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"status": "deleted", "user_id": user_id}), 200
