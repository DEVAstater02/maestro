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
from app.models.database_models import UserRecord


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

    def create_session(self, user_id: Optional[str] = None, syllabus_id: Optional[str] = None) -> str:
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
                    VALUES (%s, %s, %s, NULL)
                    """,
                    (session_id, user_id, syllabus_id),
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

    def get_user(self, user_id: str) -> Optional[UserRecord]:
        """Fetch user details by ID."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, email, password_hash, learning_style, reasoning_speed, analogy_pool, last_updated, created_at, dob, grade, interests, persona_notes FROM users WHERE id = %s",
                    (user_id,)
                )
                row = cur.fetchone()
                if row:
                    analogy_pool = row['analogy_pool']
                    if isinstance(analogy_pool, str):
                        analogy_pool = json.loads(analogy_pool)

                    return UserRecord(
                        id=row['id'],
                        name=row['name'],
                        email=row.get('email'),
                        password_hash=row.get('password_hash'),
                        learning_style=row['learning_style'],
                        reasoning_speed=row['reasoning_speed'],
                        analogy_pool=analogy_pool,
                        last_updated=row['last_updated'],
                        created_at=row['created_at'],
                        dob=row['dob'],
                        grade=row['grade'],
                        interests=row['interests'],
                        persona_notes=row.get('persona_notes'),
                    )
                return None
        except Exception as e:
            print(f"[PersistenceRepo] ERROR getting user: {e}")
            raise
        finally:
            conn.close()

    def store_syllabus(self, user_id: str, title: str, content_json: dict) -> str:
        """Store the generated syllabus in the database."""
        syllabus_id = str(uuid.uuid4())
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO syllabus (id, user_id, title, content_json)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (syllabus_id, user_id, title, json.dumps(content_json)),
                )
            conn.commit()
            print(f"[PersistenceRepo] Syllabus saved: {syllabus_id} for user {user_id}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR saving syllabus: {e}")
            raise
        finally:
            conn.close()
        return syllabus_id

    def get_syllabuses_by_user(self, user_id: str) -> List[dict]:
        """Fetch all syllabuses for a particular user."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, title, content_json, created_at
                    FROM syllabus
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    """,
                    (user_id,)
                )
                rows = cur.fetchall()
                result = []
                for row in rows:
                    content_json = row['content_json']
                    if isinstance(content_json, str):
                        try:
                            content_json = json.loads(content_json)
                        except:
                            pass
                    result.append({
                        "id": row['id'],
                        "title": row['title'],
                        "content_json": content_json,
                        "created_at": row['created_at'].isoformat() if row['created_at'] else None
                    })
                return result
        except Exception as e:
            print(f"[PersistenceRepo] ERROR getting syllabuses: {e}")
            raise
        finally:
            conn.close()

    def get_syllabus(self, syllabus_id: str) -> Optional[dict]:
        """Fetch a single syllabus by ID."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, title, content_json FROM syllabus WHERE id = %s",
                    (syllabus_id,)
                )
                row = cur.fetchone()
                if row:
                    content_json = row['content_json']
                    if isinstance(content_json, str):
                        content_json = json.loads(content_json)
                    return {
                        "id": row['id'],
                        "title": row['title'],
                        "content_json": content_json
                    }
                return None
        except Exception as e:
            print(f"[PersistenceRepo] ERROR getting syllabus: {e}")
            raise
        finally:
            conn.close()

    def get_session(self, session_id: str) -> Optional[dict]:
        """Fetch a session by ID."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, user_id, syllabus_id, session_memory_string FROM sessions WHERE id = %s",
                    (session_id,)
                )
                row = cur.fetchone()
                if row:
                    return {
                        "id": row['id'],
                        "user_id": row['user_id'],
                        "syllabus_id": row['syllabus_id'],
                        "session_memory_string": row['session_memory_string']
                    }
                return None
        except Exception as e:
            print(f"[PersistenceRepo] ERROR getting session: {e}")
            raise
        finally:
            conn.close()

    def get_latest_session(self, user_id: str = None, syllabus_id: str = None) -> Optional[dict]:
        """Fetch the most recent session for a user and syllabus."""
        if user_id is None:
            user_id = ANONYMOUS_USER_ID

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, user_id, syllabus_id, session_memory_string,
                           current_chapter_index, is_completed,
                           started_at, total_seconds
                    FROM sessions
                    WHERE user_id = %s AND syllabus_id = %s
                    ORDER BY updated_at DESC LIMIT 1
                    """,
                    (user_id, syllabus_id)
                )
                row = cur.fetchone()
                if row:
                    return {
                        "id": row['id'],
                        "user_id": row['user_id'],
                        "syllabus_id": row['syllabus_id'],
                        "session_memory_string": row['session_memory_string'],
                        "current_chapter_index": row['current_chapter_index'] or 0,
                        "is_completed": bool(row['is_completed']),
                        "started_at": row['started_at'],
                        "total_seconds": row['total_seconds'] or 0,
                    }
                return None
        except Exception as e:
            print(f"[PersistenceRepo] ERROR getting latest session: {e}")
            raise
        finally:
            conn.close()

    def mark_session_complete(self, session_id: str) -> None:
        """Set is_completed = TRUE for the given session."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE sessions SET is_completed = TRUE WHERE id = %s",
                    (session_id,),
                )
            conn.commit()
            print(f"[PersistenceRepo] Session {session_id} marked complete")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR marking session complete: {e}")
            raise
        finally:
            conn.close()

    def update_chapter_index(self, session_id: str, index: int) -> None:
        """Update current_chapter_index for the given session."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE sessions SET current_chapter_index = %s WHERE id = %s",
                    (index, session_id),
                )
            conn.commit()
            print(f"[PersistenceRepo] chapter_index → {index} for session {session_id}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR updating chapter_index: {e}")
            raise
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # Auth helpers: create_user / get_user_by_email
    # ─────────────────────────────────────────────────────────────────────────

    def create_user(
        self,
        email: str,
        name: str,
        password_hash: str,
        dob: Optional[str] = None,
        grade: Optional[str] = None,
        interests: Optional[str] = None,
        learning_style: Optional[str] = None,
    ) -> str:
        """
        Insert a new user with real credentials.
        Returns the new user UUID.
        """
        user_id = str(uuid.uuid4())
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (id, name, email, password_hash, dob, grade, interests, learning_style)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (user_id, name, email, password_hash, dob, grade, interests, learning_style or "Direct"),
                )
            conn.commit()
            print(f"[PersistenceRepo] User created: {user_id} ({email})")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR creating user: {e}")
            raise
        finally:
            conn.close()
        return user_id

    def get_user_by_email(self, email: str) -> Optional[UserRecord]:
        """Lookup a user by email (used for sign-in)."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, email, password_hash, learning_style, reasoning_speed, "
                    "analogy_pool, last_updated, created_at, dob, grade, interests, persona_notes "
                    "FROM users WHERE email = %s",
                    (email,),
                )
                row = cur.fetchone()
                if not row:
                    return None

                analogy_pool = row['analogy_pool']
                if isinstance(analogy_pool, str):
                    analogy_pool = json.loads(analogy_pool)

                return UserRecord(
                    id=row['id'],
                    name=row['name'],
                    email=row.get('email'),
                    password_hash=row.get('password_hash'),
                    learning_style=row['learning_style'],
                    reasoning_speed=row['reasoning_speed'],
                    analogy_pool=analogy_pool,
                    last_updated=row['last_updated'],
                    created_at=row['created_at'],
                    dob=row['dob'],
                    grade=row['grade'],
                    interests=row['interests'],
                    persona_notes=row.get('persona_notes'),
                )
        except Exception as e:
            print(f"[PersistenceRepo] ERROR getting user by email: {e}")
            raise
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # Memory persistence
    # ─────────────────────────────────────────────────────────────────────────

    def update_session_costs(self, session_id: str, input_tokens: int, output_tokens: int, tts_chars: int) -> None:
        """Accumulate LLM token counts and TTS character count for the session."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE sessions
                       SET llm_input_tokens  = llm_input_tokens  + %s,
                           llm_output_tokens = llm_output_tokens + %s,
                           tts_chars         = tts_chars         + %s
                     WHERE id = %s
                    """,
                    (input_tokens, output_tokens, tts_chars, session_id),
                )
            conn.commit()
            print(f"[PersistenceRepo] costs +{input_tokens}in/{output_tokens}out tokens, +{tts_chars} tts_chars for {session_id}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR updating session costs: {e}")
            raise
        finally:
            conn.close()

    def update_session_time(self, session_id: str, seconds_to_add: int) -> None:
        """Add elapsed seconds to total_seconds; set started_at on first call."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE sessions
                       SET total_seconds = total_seconds + %s,
                           started_at = COALESCE(started_at, NOW())
                     WHERE id = %s
                    """,
                    (seconds_to_add, session_id),
                )
            conn.commit()
            print(f"[PersistenceRepo] +{seconds_to_add}s for session {session_id}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR updating session time: {e}")
            raise
        finally:
            conn.close()

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

    def update_persona_notes(self, user_id: str, notes: str) -> None:
        """Update the persona_notes column for the given user."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET persona_notes = %s WHERE id = %s",
                    (notes, user_id),
                )
            conn.commit()
            print(f"[PersistenceRepo] persona_notes updated for user {user_id}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR updating persona_notes: {e}")
            raise
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # user_knowledge table
    # ─────────────────────────────────────────────────────────────────────────

    def get_user_knowledge(self, user_id: str) -> dict:
        """Return {"prior": {subject: score}, "completed": {syllabus_id: (label, score)}}."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT type, ref_id, label, score FROM user_knowledge WHERE user_id = %s",
                    (user_id,)
                )
                rows = cur.fetchall()
            result = {"prior": {}, "completed": {}}
            for row in rows:
                if row['type'] == 'prior':
                    result["prior"][row['ref_id']] = row['score']
                else:
                    result["completed"][row['ref_id']] = (row['label'], row['score'])
            return result
        except Exception as e:
            print(f"[PersistenceRepo] ERROR getting user_knowledge: {e}")
            return {"prior": {}, "completed": {}}
        finally:
            conn.close()

    def upsert_prior_knowledge(self, user_id: str, subject: str, score: int) -> None:
        """Insert or overwrite a prior-knowledge row."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO user_knowledge (user_id, type, ref_id, score)
                    VALUES (%s, 'prior', %s, %s)
                    ON DUPLICATE KEY UPDATE score = VALUES(score)
                    """,
                    (user_id, subject, min(score, 50)),
                )
            conn.commit()
            print(f"[PersistenceRepo] prior_knowledge upserted: {user_id} {subject}={score}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR upserting prior_knowledge: {e}")
        finally:
            conn.close()

    def increment_completed_course(self, user_id: str, syllabus_id: str, label: str, delta: int) -> None:
        """Atomically increment completed course score, capped at 100."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO user_knowledge (user_id, type, ref_id, label, score)
                    VALUES (%s, 'completed', %s, %s, %s)
                    ON DUPLICATE KEY UPDATE score = LEAST(score + VALUES(score), 100)
                    """,
                    (user_id, syllabus_id, label, delta),
                )
            conn.commit()
            print(f"[PersistenceRepo] completed_course incremented: {user_id} {syllabus_id} +{delta}")
        except Exception as e:
            conn.rollback()
            print(f"[PersistenceRepo] ERROR incrementing completed_course: {e}")
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
