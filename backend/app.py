import os

from flask import Flask, g
from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.logging_config import setup_logging
from backend.models.base import Base
from backend.routes.user import user_bp
from backend.routes.waypoint import waypoint_bp

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///branch.db")

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def create_app() -> Flask:
    setup_logging()
    app = Flask(__name__)

    Base.metadata.create_all(bind=engine)
    logger.info("Database schema ensured.")

    @app.before_request
    def open_db_session() -> None:
        """Create a database session for the request."""
        g.db = SessionLocal()

    @app.teardown_request
    def close_db_session(exception: BaseException | None) -> None:
        """Close request session and roll back on errors."""
        session = g.pop("db", None)
        if session is None:
            return
        if exception:
            logger.warning("Request failed; rolling back session.")
            session.rollback()
        session.close()

    app.register_blueprint(user_bp)
    app.register_blueprint(waypoint_bp)
    logger.info("Registered API blueprints.")

    return app


app = create_app()
