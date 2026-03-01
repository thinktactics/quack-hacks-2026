"""Journal entry API routes."""

from flask import Blueprint, g, jsonify, request, Response
from loguru import logger

from backend.db.journal_queries import create_journal_entry, get_journal_entry

journal_bp = Blueprint("journal", __name__, url_prefix="/api/journal")


# POST /api/journal
@journal_bp.route("", methods=["POST"])
def create_entry() -> tuple[Response, int]:
    """Create a journal entry for a (user, waypoint) pair."""
    payload = request.get_json(silent=True) or {}
    waypoint_id = payload.get("waypoint_id")
    user_id = payload.get("user_id")
    content = payload.get("content", "").strip()

    if waypoint_id is None or user_id is None or not content:
        return jsonify({"error": "waypoint_id, user_id, and content are required"}), 400

    entry = create_journal_entry(g.db, waypoint_id, user_id, content)
    logger.info(f"Journal entry saved for user {user_id}, waypoint {waypoint_id}")
    return jsonify(entry.to_dict()), 201


# GET /api/journal/<waypoint_id>/<user_id>
@journal_bp.route("/<int:waypoint_id>/<int:user_id>", methods=["GET"])
def get_entry(waypoint_id: int, user_id: int) -> tuple[Response, int]:
    """Return the journal entry for a (user, waypoint) pair."""
    entry = get_journal_entry(g.db, waypoint_id, user_id)
    if not entry:
        return jsonify({"error": "Journal entry not found"}), 404
    return jsonify(entry.to_dict()), 200
