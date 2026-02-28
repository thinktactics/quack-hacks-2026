import os

from flask import Flask, g
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.base import Base
from backend.models.user import User
from backend.models.waypoint import Waypoint
from backend.routes.user import user_bp
from backend.routes.waypoint import waypoint_bp

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///branch.db")

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def create_app() -> Flask:
    app = Flask(__name__)

    Base.metadata.create_all(bind=engine)

    @app.before_request
    def open_db_session() -> None:
        g.db = SessionLocal()

    @app.teardown_request
    def close_db_session(exception: BaseException | None) -> None:
        session = g.pop("db", None)
        if session is None:
            return
        if exception:
            session.rollback()
        session.close()

    app.register_blueprint(user_bp)
    app.register_blueprint(waypoint_bp)

    return app


app = create_app()
