"""
Database models aligned with the DDL in tables.sql.

We don't use SQLModel's table=True / metadata.create_all here because
the tables are managed externally via tables.sql DDL.  These are plain
dataclasses used only as typed containers when reading rows back from the DB.
"""

from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime


@dataclass
class UserRecord:
    """Mirrors the `users` table."""
    id: str                          # CHAR(36) UUID
    name: str
    learning_style: str = "Direct"
    reasoning_speed: str = "Moderate"
    analogy_pool: Optional[Any] = None  # JSON
    knowledge_map: Any = field(default_factory=dict)  # JSON
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None
    dob: Optional[datetime] = None
    grade: Optional[str] = None
    interests: Optional[str] = None


@dataclass
class SessionRecord:
    """Mirrors the `sessions` table."""
    id: str                          # CHAR(36) UUID
    user_id: str
    syllabus_id: Optional[str] = None
    current_chapter_index: int = 0
    session_memory_string: Optional[str] = None
    is_completed: bool = False
    updated_at: Optional[datetime] = None


@dataclass
class ConversationRecord:
    """Mirrors the `conversations` table."""
    session_id: str                  # CHAR(36) UUID – FK → sessions.id
    history: Any = field(default_factory=list)   # JSON array of messages
    last_updated_at: Optional[datetime] = None
