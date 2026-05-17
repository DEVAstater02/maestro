import os
from app.repositories.persistence_repo import PersistenceRepository
from app.prompts.curation import CURATION_SYSTEM_PROMPT, CURATION_USER_CONTEXT
from app.services.syllabus_service import SyllabusService
from app.models.user_models import SyllabusRequest
import re

class CurationService:
    def __init__(self):
        LLM_PROVIDER = os.getenv("LLM_PROVIDER", "claude").lower()
        print(f"[CurationService] Using LLM provider: {LLM_PROVIDER}")

        if LLM_PROVIDER == "gemini":
            from app.repositories.gemini import GeminiRepository
            self.llm_repo = GeminiRepository()
        elif LLM_PROVIDER == "claude":
            from app.repositories.claude import ClaudeRepository
            self.llm_repo = ClaudeRepository()
        elif LLM_PROVIDER == "openai":
            from app.repositories.openai_repo import OpenAIRepository
            self.llm_repo = OpenAIRepository()
        else:
            raise ValueError(
                f"Unknown LLM_PROVIDER '{LLM_PROVIDER}'. "
                "Supported values: 'claude', 'gemini', 'openai'"
            )
        self.persistence_repo = PersistenceRepository()
        self.syllabus_service = SyllabusService()

    def get_user_profile(self, user_id: str) -> str:
        user_record = self.persistence_repo.get_user(user_id)
        if not user_record:
            return "No existing profile data."

        knowledge = self.persistence_repo.get_user_knowledge(user_id)

        lines = [
            f"Name: {user_record.name}",
            f"Grade: {user_record.grade or 'Unknown'}",
            f"Learning Style: {user_record.learning_style}",
            f"Interests: {user_record.interests or 'Not specified'}",
            f"Reasoning Speed: {user_record.reasoning_speed}",
        ]
        if knowledge["prior"]:
            prior = ", ".join(f"{k} ({v}/50)" for k, v in knowledge["prior"].items())
            lines.append(f"Prior subject familiarity: {prior}")
        if knowledge["completed"]:
            done_parts = []
            for label, score in knowledge["completed"].values():
                done_parts.append(f"{label} ({'mastered' if score >= 100 else str(score) + '%'})")
            lines.append(f"Completed courses: {', '.join(done_parts)}")
        if user_record.persona_notes:
            lines.append(f"Behavioral notes: {user_record.persona_notes}")
        return "\n".join(lines)

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
