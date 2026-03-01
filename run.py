"""Local runner for the BR@NCH backend."""

import os
import platform
import sys

from loguru import logger

from backend.app import DATABASE_URL, app
from backend.logging_config import setup_logging


def _print_setup_reminder() -> None:
    """Print quick setup reminders for Windows and Linux/macOS."""
    logger.info("Setup reminder:")
    logger.info("Windows: .\\.venv\\Scripts\\Activate.ps1")
    logger.info("Linux/macOS: source .venv/bin/activate")
    logger.info("Install deps: pip install -r backend/requirements.txt")
    logger.info("Optional DB override: set DATABASE_URL (default: sqlite:///branch.db)")


def _warn_if_no_venv() -> None:
    """Warn if Python does not appear to run from a virtual environment."""
    in_venv = sys.prefix != getattr(sys, "base_prefix", sys.prefix)
    if not in_venv:
        logger.warning("Virtual environment does not appear active.")


def main() -> None:
    """Start the Flask development server."""
    setup_logging()
    _print_setup_reminder()
    _warn_if_no_venv()

    logger.info(f"Python: {platform.python_version()}")
    logger.info(f"DATABASE_URL: {DATABASE_URL}")

    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"

    logger.info(f"Starting server on http://127.0.0.1:{port} (debug={debug})")
    app.run(host="127.0.0.1", port=port, debug=debug)


if __name__ == "__main__":
    main()
