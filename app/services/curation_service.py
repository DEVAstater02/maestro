from app.repositories.claude import ClaudeRepository
from app.repositories.persistence_repo import PersistenceRepository
from app.prompts.curation import CURATION_SYSTEM_PROMPT, CURATION_USER_CONTEXT
from app.services.syllabus_service import SyllabusService
from app.models.user_models import SyllabusRequest
import re

class CurationService:
    def __init__(self):
        self.llm_repo = ClaudeRepository()
        self.persistence_repo = PersistenceRepository()
        self.syllabus_service = SyllabusService()

    def get_user_profile(self, user_id: str) -> str:
        user_record = self.persistence_repo.get_user(user_id)
        if not user_record:
            return "No existing profile data."
        
        user_profile_str = f"Name: {user_record.name}\n"
        user_profile_str += f"Grade: {user_record.grade or 'Unknown'}\n"
        user_profile_str += f"Learning Style: {user_record.learning_style}\n"
        user_profile_str += f"Interests: {user_record.interests or 'Not specified'}\n"
        user_profile_str += f"Reasoning Speed: {user_record.reasoning_speed}\n"
        return user_profile_str

    async def generate_curation_question(self, topic: str, user_profile_str: str, subject: str, curation_history_text: str) -> str:
        formatted_user_prompt = CURATION_USER_CONTEXT.format(
            TOPIC=topic,
            USER_PERSONA=user_profile_str,
            SUBJECT=subject,
            CURATION_HISTORY=curation_history_text
        )
        return await self.llm_repo.generate_response(
            prompt=formatted_user_prompt, 
            system_prompt=CURATION_SYSTEM_PROMPT,
            max_tokens=4048
        )

    async def generate_syllabus(self, topic: str, user_persona: str, subject: str, conclusion_text: str) -> dict:
        request = SyllabusRequest(
            topic=f"{topic} (Context: {conclusion_text})",
            user_persona=user_persona,
            subject=subject
        )
        return await self.syllabus_service.generate_syllabus(request)
        
    def check_conclusion(self, llm_response: str) -> str:
        if "<conclude_curation>" in llm_response:
            conclusion_match = re.search(r'<conclude_curation>(.*?)</conclude_curation>', llm_response, re.DOTALL)
            return conclusion_match.group(1).strip() if conclusion_match else "Great! I have enough information to build your syllabus."
        return None

    def store_syllabus(self, user_id: str, title: str, content_json: dict) -> str:
        return self.persistence_repo.store_syllabus(
            user_id=user_id,
            title=title,
            content_json=content_json
        )
