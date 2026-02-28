from sqlalchemy.orm import Session

from backend.db.user_queries import get_user
from backend.models.waypoint import Waypoint


def get_waypoint(session: Session, waypoint_id: int) -> Waypoint | None:
    return session.query(Waypoint).filter(Waypoint.id == waypoint_id).first()


def get_waypoint_by_coords(session: Session, lat: float, lon: float) -> Waypoint | None:
    return (
        session.query(Waypoint)
        .filter((Waypoint.lat == lat) & (Waypoint.lon == lon))
        .first()
    )


def get_children(session: Session, waypoint_id: int) -> list[Waypoint]:
    parent = get_waypoint(session, waypoint_id)
    if not parent or not parent.children:
        return []
    return session.query(Waypoint).filter(Waypoint.id.in_(parent.children)).all()


def create_waypoint(
    session: Session,
    lat: float,
    lon: float,
    name: str,
    api_id: str | None = None,
    children: list[int] | None = None,
) -> Waypoint:
    waypoint = Waypoint(
        api_id=api_id,
        lat=lat,
        lon=lon,
        name=name,
        children=children or [],
        visited=False,
    )
    session.add(waypoint)
    session.commit()
    session.refresh(waypoint)
    return waypoint


def add_child(session: Session, waypoint_id: int, child_id: int) -> Waypoint | None:
    waypoint = get_waypoint(session, waypoint_id)
    if waypoint and child_id not in waypoint.children:
        waypoint.children.append(child_id)
        session.commit()
        session.refresh(waypoint)
    return waypoint


def set_waypoint_visited(
    session: Session, waypoint_id: int, visited: bool = True
) -> Waypoint | None:
    waypoint = get_waypoint(session, waypoint_id)
    if not waypoint:
        return None
    waypoint.visited = visited
    session.commit()
    session.refresh(waypoint)
    return waypoint


def _build_tree(session: Session, waypoint_id: int, seen: set[int]) -> dict | None:
    if waypoint_id in seen:
        return None
    seen.add(waypoint_id)

    waypoint = get_waypoint(session, waypoint_id)
    if not waypoint:
        return None

    child_nodes: list[dict] = []
    for child_id in waypoint.children:
        child_tree = _build_tree(session, child_id, seen)
        if child_tree is not None:
            child_nodes.append(child_tree)

    node = waypoint.to_dict()
    node["children_nodes"] = child_nodes
    return node


def get_waypoint_tree_for_user(session: Session, user_id: int) -> dict | None:
    user = get_user(session, user_id)
    if not user:
        return None
    return _build_tree(session, user.root_waypoint_id, set())


def get_children_for_user_waypoint(
    session: Session, user_id: int, waypoint_id: int
) -> list[Waypoint] | None:
    tree = get_waypoint_tree_for_user(session, user_id)
    if tree is None:
        return None

    def contains_waypoint(node: dict, target_id: int) -> bool:
        if node["id"] == target_id:
            return True
        return any(
            contains_waypoint(child, target_id) for child in node["children_nodes"]
        )

    if not contains_waypoint(tree, waypoint_id):
        return None

    return get_children(session, waypoint_id)
