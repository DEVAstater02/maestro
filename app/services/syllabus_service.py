from typing import List, Dict, Any, Optional
import json
import re
from app.models.user_models import SyllabusRequest
from app.prompts.syllabus import SYLLABUS_GENERATION_PROMPT
from app.repositories.claude import ClaudeRepository
from app.repositories.persistence_repo import PersistenceRepository

class SyllabusService:
    def __init__(self):
        self.claude_repo = ClaudeRepository()
        self.persistence_repo = PersistenceRepository()

    async def generate_syllabus(self, request: SyllabusRequest) -> Dict[str, Any]:
        # Format the prompt with user inputs
        formatted_prompt = SYLLABUS_GENERATION_PROMPT.replace("{{TOPIC}}", request.topic)
        formatted_prompt = formatted_prompt.replace("{{USER_PERSONA}}", request.user_persona)
        formatted_prompt = formatted_prompt.replace("{{SUBJECT}}", request.subject)
        
        # Call Claude API
        response_text = await self.claude_repo.generate_response(
            prompt=formatted_prompt,
            model="claude-sonnet-4-6" 
        )
        
        # Attempt to parse the response as JSON to ensure validity
        json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        # Fallback: find anything between the first { and last }
        json_match = re.search(r'(\{.*\})', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        else:
            return {"raw_response": response_text}

    def list_syllabuses(self, user_id: str) -> List[dict]:
        return self.persistence_repo.get_syllabuses_by_user(user_id)

    def store_syllabus(self, user_id: str, title: str, content_json: dict) -> str:
        return self.persistence_repo.store_syllabus(user_id, title, content_json)
