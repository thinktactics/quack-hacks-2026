"""Database query helpers for journal entries."""

from sqlalchemy.orm import Session

from backend.models.journal import JournalEntry


def create_journal_entry(
    session: Session, waypoint_id: int, user_id: int, content: str
) -> JournalEntry:
    """Create a journal entry for a (user, waypoint) pair. Idempotent: returns existing if found."""
    existing = (
        session.query(JournalEntry)
        .filter(JournalEntry.waypoint_id == waypoint_id, JournalEntry.user_id == user_id)
        .first()
    )
    if existing:
        return existing
    entry = JournalEntry(waypoint_id=waypoint_id, user_id=user_id, content=content)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def get_journal_entry(
    session: Session, waypoint_id: int, user_id: int
) -> JournalEntry | None:
    """Return the journal entry for a (user, waypoint) pair, or None if not found."""
    return (
        session.query(JournalEntry)
        .filter(JournalEntry.waypoint_id == waypoint_id, JournalEntry.user_id == user_id)
        .first()
    )
