"""User model and serialization types."""

from typing import TypedDict

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base


class UserDict(TypedDict):
    """Serialized user response shape."""

    id: int
    username: str
    lat: float
    lon: float
    root_waypoint_id: int


class User(Base):
    """User model with authentication and root waypoint reference."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    lat: Mapped[float] = mapped_column(Float, index=True)
    lon: Mapped[float] = mapped_column(Float, index=True)
    root_waypoint_id: Mapped[int] = mapped_column(Integer, ForeignKey("waypoints.id"))

    root_waypoint = relationship("Waypoint", foreign_keys=[root_waypoint_id])

    def to_dict(self) -> UserDict:
        """Return a JSON-serializable user payload."""
        return {
            "id": self.id,
            "username": self.username,
            "lat": self.lat,
            "lon": self.lon,
            "root_waypoint_id": self.root_waypoint_id,
        }

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"
