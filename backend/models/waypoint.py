from sqlalchemy import Boolean, Float, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class Waypoint(Base):
    """Waypoint model representing a location node in the skill tree."""

    __tablename__ = "waypoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    children: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)
    visited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    api_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    lat: Mapped[float] = mapped_column(
        Float, nullable=False, index=True
    )  # cached from api
    lon: Mapped[float] = mapped_column(
        Float, nullable=False, index=True
    )  # cached from api
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # cached from api

    def to_dict(self) -> dict[str, int | float | str | list[int] | bool | None]:
        return {
            "id": self.id,
            "api_id": self.api_id,
            "lat": self.lat,
            "lon": self.lon,
            "name": self.name,
            "children": self.children,
            "visited": self.visited,
        }

    def __repr__(self) -> str:
        return f"<Waypoint(id={self.id}, name={self.name}, lat={self.lat}, lon={self.lon})>"
