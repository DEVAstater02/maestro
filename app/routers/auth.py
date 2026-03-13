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

from app.services.auth_service import AuthService

router = APIRouter()

def _auth_service() -> AuthService:
    return AuthService()

# ── Signup ────────────────────────────────────────────────────────────────────

@router.post("/auth/signup", response_model=AuthResponse)
def signup(body: SignupRequest, service: AuthService = Depends(_auth_service)):
    try:
        return service.signup(body)
    except ValueError as e:
        if str(e) == "An account with this email already exists.":
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

# ── Signin ────────────────────────────────────────────────────────────────────

@router.post("/auth/signin", response_model=AuthResponse)
def signin(body: SigninRequest, service: AuthService = Depends(_auth_service)):
    try:
        return service.signin(body)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

# ── Me (validate token + return profile) ─────────────────────────────────────

@router.get("/auth/me")
def me(
    authorization: Optional[str] = Header(default=None), 
    service: AuthService = Depends(_auth_service)
):
    try:
        return service.get_profile_from_token(authorization)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
