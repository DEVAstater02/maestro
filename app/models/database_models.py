from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import datetime

class Session(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True, unique=True)
    memory: str = Field(default="")
    turn_counter: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    messages: List["Message"] = Relationship(back_populates="session")

class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    role: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    session: Session = Relationship(back_populates="messages")
