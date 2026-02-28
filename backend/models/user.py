from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base


class User(Base):
    """User model with authentication and root waypoint reference."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(
        String(80), unique=True, nullable=False, index=True
    )
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    root_waypoint_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("waypoints.id"), nullable=False
    )

    root_waypoint = relationship("Waypoint", foreign_keys=[root_waypoint_id])

    def to_dict(self) -> dict[str, int | str]:
        return {
            "id": self.id,
            "username": self.username,
            "root_waypoint_id": self.root_waypoint_id,
        }

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"
