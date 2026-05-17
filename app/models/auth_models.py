from pydantic import BaseModel, EmailStr
from typing import Optional


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    dob: Optional[str] = None      # ISO date string YYYY-MM-DD
    grade: Optional[str] = None
    interests: Optional[str] = None
    learning_style: Optional[str] = None


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str


class TokenData(BaseModel):
    user_id: str
    name: str
