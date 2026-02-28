from sqlalchemy.orm import Session

from backend.models.user import User
from backend.models.waypoint import Waypoint


def get_user(session: Session, user_id: int) -> User | None:
    return session.query(User).filter(User.id == user_id).first()


def get_user_by_username(session: Session, username: str) -> User | None:
    return session.query(User).filter(User.username == username).first()


def create_user(
    session: Session, username: str, password: str, root_waypoint_id: int
) -> User:
    user = User(username=username, password=password, root_waypoint_id=root_waypoint_id)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_root_waypoint_for_user(session: Session, user_id: int) -> Waypoint | None:
    user = get_user(session, user_id)
    if not user:
        return None
    return session.query(Waypoint).filter(Waypoint.id == user.root_waypoint_id).first()


def delete_user(session: Session, user_id: int) -> bool:
    user = get_user(session, user_id)
    if not user:
        return False
    session.delete(user)
    session.commit()
    return True
