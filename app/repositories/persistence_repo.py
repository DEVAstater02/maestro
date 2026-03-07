"""
PersistenceRepository
─────────────────────
Encapsulates all MySQL I/O for the tutor's session-persistence layer.

Tables used (defined in tables.sql):
  • users          – student profiles
  • sessions       – per-session state (memory string, chapter index …)
  • conversations  – JSON history blob for a session
"""

import json
import uuid
from typing import List, Optional

from app.database import get_connection


# ── A fixed "anonymous" user that every WebSocket session is linked to ────────
# Replace with real auth once a user-management layer exists.
ANONYMOUS_USER_ID   = "00000000-0000-0000-0000-000000000000"
ANONYMOUS_USER_NAME = "anonymous"


class PersistenceRepository:
    """
    All methods are synchronous (pymysql is blocking).
    Call them from async handlers with `asyncio.to_thread(...)` if needed,
    or just call directly – the DB round-trips are fast enough for our load.

    Each public method opens its own connection and closes it when done so
    that we never hold a connection idle across long-running WebSocket turns.
    """

    # ─────────────────────────────────────────────────────────────────────────
    # Session creation
    # ─────────────────────────────────────────────────────────────────────────

    def create_session(self, user_id: Optional[str] = None) -> str:
        """
        1. Ensure the user row exists (create anonymous user on first run).
        2. Insert a new row into `sessions`.
        3. Return the new session UUID.
        """
        if user_id is None:
            user_id = ANONYMOUS_USER_ID

        session_id = str(uuid.uuid4())

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # Ensure the user exists
                cur.execute(
                    "INSERT IGNORE INTO users (id, name) VALUES (%s, %s)",
                    (user_id, ANONYMOUS_USER_NAME),
                )

                # Create the session row
                cur.execute(
                    """
                    INSERT INTO sessions (id, user_id, syllabus_id, session_memory_string)
                    VALUES (%s, %s, NULL, NULL)
                    """,
                    (session_id, user_id),
                )
            conn.commit()
            print(f"[PersistenceRepo] Session created: {session_id}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR creating session: {e}")
            raise
        finally:
            conn.close()

        return session_id

    # ─────────────────────────────────────────────────────────────────────────
    # Memory persistence
    # ─────────────────────────────────────────────────────────────────────────

    def update_session_memory(self, session_id: str, memory_string: str) -> None:
        """Update the `session_memory_string` column for the given session."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE sessions
                       SET session_memory_string = %s
                     WHERE id = %s
                    """,
                    (memory_string, session_id),
                )
            conn.commit()
            print(f"[PersistenceRepo] session_memory_string updated for session {session_id}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR updating session memory: {e}")
            raise
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # Conversation history upsert
    # ─────────────────────────────────────────────────────────────────────────

    def upsert_conversation_history(
        self,
        session_id: str,
        new_messages: List[dict],
    ) -> None:
        """
        UPSERT the `conversations` table for this session.

        Strategy:
          • If no row exists yet → INSERT with `new_messages` as the history.
          • If a row exists → merge: existing_history + new_messages, then UPDATE.

        `new_messages` are the messages being *evicted* from the in-memory
        `messages` array during `update_memory` (i.e. everything except the
        last 5 turns that get kept in RAM).
        """
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # Fetch existing history (if any)
                cur.execute(
                    "SELECT history FROM conversations WHERE session_id = %s",
                    (session_id,),
                )
                row = cur.fetchone()

                if row is None:
                    # First time – INSERT
                    cur.execute(
                        """
                        INSERT INTO conversations (session_id, history)
                        VALUES (%s, %s)
                        """,
                        (session_id, json.dumps(new_messages)),
                    )
                else:
                    # Merge existing + new
                    existing: list = (
                        row["history"]
                        if isinstance(row["history"], list)
                        else json.loads(row["history"])
                    )
                    merged = existing + new_messages
                    cur.execute(
                        """
                        UPDATE conversations
                           SET history = %s
                         WHERE session_id = %s
                        """,
                        (json.dumps(merged), session_id),
                    )

            conn.commit()
            print(
                f"[PersistenceRepo] Conversation history upserted for session {session_id} "
                f"(+{len(new_messages)} messages)"
            )
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR upserting conversation history: {e}")
            raise
        finally:
            conn.close()
