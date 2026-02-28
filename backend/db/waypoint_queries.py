"""Database query helpers for waypoints and tree expansion."""

from sqlalchemy.orm import Session

from backend.db.user_queries import get_user
from backend.models.waypoint import Waypoint, TreeDict


def get_waypoint(session: Session, waypoint_id: int) -> Waypoint | None:
    """Return a waypoint by ID, or None if not found."""
    return session.query(Waypoint).filter(Waypoint.id == waypoint_id).first()


def set_waypoint_visited(
    session: Session, waypoint_id: int, visited: bool = True
) -> Waypoint | None:
    """Set visited status for one waypoint and return the updated row."""
    waypoint = get_waypoint(session, waypoint_id)
    if not waypoint:
        return None
    waypoint.visited = visited
    session.commit()
    session.refresh(waypoint)
    return waypoint


def _build_tree(session: Session, waypoint_id: int, seen: set[int]) -> TreeDict | None:
    """Build a nested waypoint tree from a root waypoint ID."""
    if waypoint_id in seen:
        return None
    seen.add(waypoint_id)

    waypoint = get_waypoint(session, waypoint_id)
    if not waypoint:
        return None

    child_nodes: list[TreeDict] = []
    for child_id in waypoint.children:
        child_tree = _build_tree(session, child_id, seen)
        if child_tree is not None:
            child_nodes.append(child_tree)

    node: TreeDict = {
        "id": waypoint.id,
        "children": child_nodes,
        "visited": waypoint.visited,
        "api_id": waypoint.api_id,
        "lat": waypoint.lat,
        "lon": waypoint.lon,
        "name": waypoint.name,
    }
    return node


def get_waypoint_tree_for_user(session: Session, user_id: int) -> TreeDict | None:
    """Return the user's root waypoint tree, or None if user is missing."""
    user = get_user(session, user_id)
    if not user:
        return None
    return _build_tree(session, user.root_waypoint_id, set())
