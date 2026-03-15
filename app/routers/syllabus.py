from fastapi import APIRouter, HTTPException
from app.models.user_models import SyllabusRequest
from app.services.syllabus_service import SyllabusService

from typing import Optional
from fastapi import Header, Depends
from app.utils.auth_utils import decode_access_token

router = APIRouter()

def _syllabus_service() -> SyllabusService:
    return SyllabusService()

@router.post("/generate_syllabus")
async def generate_syllabus(request: SyllabusRequest):
    """
    Generates a syllabus based on topic, user persona, and subject.
    Uses SyllabusService to generate the JSON structure.
    """
    try:
        service = _syllabus_service()
        return await service.generate_syllabus(request)
    except Exception as e:
        print(f"Error in generate_syllabus: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/syllabus/list")
async def list_syllabuses(
    authorization: Optional[str] = Header(default=None),
    service: SyllabusService = Depends(_syllabus_service)
):
    """Fetch all generated syllabuses for the authenticated user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")

    user_id = payload.get("sub")

    syllabuses = service.list_syllabuses(user_id)
    return {"syllabuses": syllabuses}

@router.get("/syllabus/{syllabus_id}")
async def get_syllabus(
    syllabus_id: str,
    authorization: Optional[str] = Header(default=None),
    service: SyllabusService = Depends(_syllabus_service)
):
    """Fetch a single syllabus by ID."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")

    syllabus = service.get_syllabus(syllabus_id)
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return syllabus
