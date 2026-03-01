"""Waypoint model and tree serialization types."""

from datetime import datetime
from typing import TypedDict

from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class TreeDict(TypedDict):
    """Nested waypoint tree response shape."""

    id: int
    children: list["TreeDict"]
    visited: bool
    visited_at: str | None
    api_id: str
    lat: float
    lon: float
    name: str
    category: str | None


class Waypoint(Base):
    """Waypoint model representing a location node in the skill tree."""

    __tablename__ = "waypoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    children: Mapped[list[int]] = mapped_column(JSON, default=list)
    visited: Mapped[bool] = mapped_column(Boolean, default=False)
    visited_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    api_id: Mapped[str] = mapped_column(String(255), index=True)
    lat: Mapped[float] = mapped_column(Float, index=True)  # cached from api
    lon: Mapped[float] = mapped_column(Float, index=True)  # cached from api
    name: Mapped[str] = mapped_column(String(255))  # cached from api
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)

    def to_dict(self) -> dict:
        """Return a flat waypoint payload with child waypoint IDs."""
        return {
            "id": self.id,
            "children": self.children,
            "visited": self.visited,
            "visited_at": self.visited_at.isoformat() if self.visited_at else None,
            "api_id": self.api_id,
            "lat": self.lat,
            "lon": self.lon,
            "name": self.name,
            "category": self.category,
        }

    def __repr__(self) -> str:
        return f"<Waypoint(id={self.id}, name={self.name}, lat={self.lat}, lon={self.lon})>"
