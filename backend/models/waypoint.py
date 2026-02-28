"""Waypoint model and tree serialization types."""

from typing import TypedDict

from sqlalchemy import Boolean, Float, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class TreeDict(TypedDict):
    """Nested waypoint tree response shape."""

    id: int
    children: list["TreeDict"]
    visited: bool
    api_id: str
    lat: float
    lon: float
    name: str


class Waypoint(Base):
    """Waypoint model representing a location node in the skill tree."""

    __tablename__ = "waypoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    children: Mapped[list[int]] = mapped_column(JSON, default=list)
    visited: Mapped[bool] = mapped_column(Boolean, default=False)

    api_id: Mapped[str] = mapped_column(String(255), index=True)
    lat: Mapped[float] = mapped_column(Float, index=True)  # cached from api
    lon: Mapped[float] = mapped_column(Float, index=True)  # cached from api
    name: Mapped[str] = mapped_column(String(255))  # cached from api

    def to_dict(self) -> dict:
        """Return a flat waypoint payload with child waypoint IDs."""
        return {
            "id": self.id,
            "children": self.children,
            "visited": self.visited,
            "api_id": self.api_id,
            "lat": self.lat,
            "lon": self.lon,
            "name": self.name,
        }

    def __repr__(self) -> str:
        return f"<Waypoint(id={self.id}, name={self.name}, lat={self.lat}, lon={self.lon})>"
