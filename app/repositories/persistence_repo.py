from sqlmodel import Session, select
from app.models.database_models import Session as DBSession, Message as DBMessage
from typing import List, Optional
from datetime import datetime

class PersistenceRepository:
    def __init__(self, db_session: Session):
        self.db = db_session

    def create_session(self, session_id: str) -> DBSession:
        new_session = DBSession(session_id=session_id)
        self.db.add(new_session)
        self.db.commit()
        self.db.refresh(new_session)
        return new_session

    def get_session(self, session_id: str) -> Optional[DBSession]:
        statement = select(DBSession).where(DBSession.session_id == session_id)
        results = self.db.exec(statement)
        return results.first()

    def update_session(self, session_id: str, memory: str, turn_counter: int):
        db_session = self.get_session(session_id)
        if db_session:
            db_session.memory = memory
            db_session.turn_counter = turn_counter
            db_session.updated_at = datetime.utcnow()
            self.db.add(db_session)
            self.db.commit()
            self.db.refresh(db_session)
        return db_session

    def add_message(self, session_id: str, role: str, content: str):
        db_session = self.get_session(session_id)
        if db_session:
            new_message = DBMessage(
                session_id=db_session.id,
                role=role,
                content=content
            )
            self.db.add(new_message)
            self.db.commit()
            self.db.refresh(new_message)
        return db_session

    def get_messages(self, session_id: str, limit: int = 10) -> List[DBMessage]:
        db_session = self.get_session(session_id)
        if db_session:
            statement = select(DBMessage).where(DBMessage.session_id == db_session.id).order_by(DBMessage.created_at.desc()).limit(limit)
            results = self.db.exec(statement)
            # return in chronological order
            return sorted(results.all(), key=lambda x: x.created_at)
        return []
