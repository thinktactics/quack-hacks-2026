"""Shared Loguru logger configuration."""

import sys

from loguru import logger


def setup_logging() -> None:
    """Configure a single console logger for the app."""
    logger.remove()
    logger.add(
        sys.stdout,
        level="INFO",
        colorize=True,
        backtrace=False,
        diagnose=False,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    )
