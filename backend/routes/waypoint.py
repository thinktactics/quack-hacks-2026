"""Waypoint API routes."""

import random

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

    if visited and not waypoint.children:
        new_ids: list[int] = []
        try:
            logger.info(
                f"Waypoint {waypoint_id} marked visited with no children - querying OSM"
            )
            nearby = query_nearby(waypoint.lat, waypoint.lon, rad=500.0, limit=10)
            logger.info(f"Found {len(nearby)} nearby POIs")

            if nearby:
                num_children = random.randint(1, min(3, len(nearby)))
                selected = random.sample(nearby, num_children)
                for poi in selected:
                    try:
                        child = create_waypoint(
                            g.db, poi["id"], poi["lat"], poi["lon"], poi["name"]
                        )
                        new_ids.append(child.id)
                        logger.info(f"Created child waypoint {child.id}: {child.name}")
                    except Exception as child_error:
                        logger.warning(
                            f"Skipping POI due to create error: {child_error}"
                        )
            else:
                logger.warning(f"No nearby POIs found for waypoint {waypoint_id}")
        except Exception as e:
            logger.error(f"OSM query failed for waypoint {waypoint_id}: {e}")

        if new_ids:
            updated = add_children_to_waypoint(g.db, waypoint_id, new_ids)
            if updated:
                waypoint = updated
                logger.info(
                    f"Successfully added {len(new_ids)} children to waypoint {waypoint_id}"
                )

    return jsonify(waypoint.to_dict()), 200
