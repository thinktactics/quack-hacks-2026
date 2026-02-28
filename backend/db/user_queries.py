"""Database query helpers for users."""

from sqlalchemy.orm import Session

from backend.models.user import User


def get_user(session: Session, user_id: int) -> User | None:
    """Return a user by ID, or None if not found."""
    return session.query(User).filter(User.id == user_id).first()


def create_user(session: Session, username: str, root_waypoint_id: int) -> User:
    """Create and persist a user with a root waypoint."""
    user = User(username=username, root_waypoint_id=root_waypoint_id)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
