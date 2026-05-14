from typing import Optional, Dict
from app.models.auth_models import SignupRequest, SigninRequest, AuthResponse
from app.repositories.persistence_repo import PersistenceRepository
from app.utils.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

class AuthService:
    def __init__(self):
        self.repo = PersistenceRepository()

    def signup(self, body: SignupRequest) -> AuthResponse:
        # Check for duplicate email
        existing = self.repo.get_user_by_email(body.email)
        if existing:
            raise ValueError("An account with this email already exists.")

        hashed = hash_password(body.password)
        user_id = self.repo.create_user(
            email=body.email,
            name=body.name,
            password_hash=hashed,
            dob=body.dob,
            grade=body.grade,
            interests=body.interests,
        )

        token = create_access_token(user_id=user_id, name=body.name)
        return AuthResponse(token=token, user_id=user_id, name=body.name)

    def signin(self, body: SigninRequest) -> AuthResponse:
        user = self.repo.get_user_by_email(body.email)
        if not user or not user.password_hash:
            raise ValueError("Invalid email or password.")

        if not verify_password(body.password, user.password_hash):
            raise ValueError("Invalid email or password.")

        token = create_access_token(user_id=user.id, name=user.name)
        return AuthResponse(token=token, user_id=user.id, name=user.name)

    def get_profile_from_token(self, authorization: Optional[str]) -> Dict[str, str]:
        if not authorization or not authorization.startswith("Bearer "):
            raise ValueError("Missing or malformed Authorization header.")

        token = authorization.removeprefix("Bearer ").strip()
        payload = decode_access_token(token)
        if not payload:
            raise ValueError("Token is invalid or expired.")

        return {
            "user_id": payload.get("sub"),
            "name": payload.get("name"),
        }
