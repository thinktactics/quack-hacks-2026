"""Database query helpers for users."""

from sqlalchemy.orm import Session

from backend.models.user import User


def get_user(session: Session, user_id: int) -> User | None:
    """Return a user by ID, or None if not found."""
    return session.query(User).filter(User.id == user_id).first()


def create_user(
    session: Session,
    username: str,
    lat: float,
    lon: float,
    root_waypoint_id: int | None = None,
) -> User:
    """Create and persist a user, optionally with a root waypoint."""
    user = User(username=username, lat=lat, lon=lon, root_waypoint_id=root_waypoint_id)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def set_user_root(session: Session, user_id: int, waypoint_id: int) -> User | None:
    """Assign a root waypoint to a user. Returns the updated user or None if not found."""
    user = get_user(session, user_id)
    if not user:
        return None
    user.root_waypoint_id = waypoint_id
    session.commit()
    session.refresh(user)
    return user
