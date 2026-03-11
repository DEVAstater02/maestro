"""
auth.py  –  FastAPI router for signup / signin / me
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional

from app.models.user_models import SignupRequest, SigninRequest, AuthResponse
from app.repositories.persistence_repo import PersistenceRepository
from app.utils.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

router = APIRouter()


def _repo() -> PersistenceRepository:
    return PersistenceRepository()


# ── Signup ────────────────────────────────────────────────────────────────────

@router.post("/auth/signup", response_model=AuthResponse)
def signup(body: SignupRequest, repo: PersistenceRepository = Depends(_repo)):
    # Check for duplicate email
    existing = repo.get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    hashed = hash_password(body.password)
    user_id = repo.create_user(
        email=body.email,
        name=body.name,
        password_hash=hashed,
        dob=body.dob,
        grade=body.grade,
        interests=body.interests,
    )

    token = create_access_token(user_id=user_id, name=body.name)
    return AuthResponse(token=token, user_id=user_id, name=body.name)


# ── Signin ────────────────────────────────────────────────────────────────────

@router.post("/auth/signin", response_model=AuthResponse)
def signin(body: SigninRequest, repo: PersistenceRepository = Depends(_repo)):
    user = repo.get_user_by_email(body.email)
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user_id=user.id, name=user.name)
    return AuthResponse(token=token, user_id=user.id, name=user.name)


# ── Me (validate token + return profile) ─────────────────────────────────────

@router.get("/auth/me")
def me(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")

    return {
        "user_id": payload.get("sub"),
        "name": payload.get("name"),
    }
