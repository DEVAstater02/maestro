import os
import re
from typing import Tuple, List, Dict
from app.repositories import claude, gemini
from app.repositories.persistence_repo import PersistenceRepository
from app.prompts.session_memory import SESSION_MEMORY_PROMPT

class ConversationService:
    def __init__(self):
        self.persistence_repo = PersistenceRepository()
        
        # Determine LLM Provider
        LLM_PROVIDER = os.getenv("LLM_PROVIDER", "claude").lower()
        print(f"[ConversationService] Using LLM provider: {LLM_PROVIDER}")
        
        if LLM_PROVIDER == "gemini":
            self.llm_repo = gemini.GeminiRepository()
        elif LLM_PROVIDER == "claude":
            self.llm_repo = claude.ClaudeRepository()
        else:
            raise ValueError(
                f"Unknown LLM_PROVIDER '{LLM_PROVIDER}'. "
                "Supported values: 'claude', 'gemini'"
            )

    def get_llm_repo(self):
        """Returns the active LLM repository instance for services that need it directly (e.g. VisualizerService)"""
        return self.llm_repo

    def create_session(self, user_id: str, syllabus_id: str = None) -> str:
        return self.persistence_repo.create_session(user_id=user_id, syllabus_id=syllabus_id)

    def get_session(self, session_id: str) -> Optional[Dict]:
        return self.persistence_repo.get_session(session_id)

    def get_syllabus(self, syllabus_id: str) -> Optional[Dict]:
        return self.persistence_repo.get_syllabus(syllabus_id)

    def get_latest_session(self, user_id: str = None, syllabus_id: str = None) -> Optional[Dict]:
        return self.persistence_repo.get_latest_session(user_id, syllabus_id)

    def stream_response(self, prompt: str):
        return self.llm_repo.stream_response(prompt=prompt)

    async def generate_response(self, prompt: str) -> str:
        return await self.llm_repo.generate_response(prompt=prompt)

    async def update_memory(
        self,
        messages: List[Dict[str, str]],
        TURN_COUNTER: int,
        SESSION_MEMORY: str,
        session_id: str = None,
        force: bool = False
    ) -> Tuple[int, str]:
        if (TURN_COUNTER >= 10 or force) and messages:
            print("[Maestro] Updating session memory...")
            TURN_COUNTER = 0

            prompt = SESSION_MEMORY_PROMPT.format(
                CURRENT_SESSION_MEMORY=SESSION_MEMORY,
                CONVERSATION_MESSAGES=self.format_history(messages)
            )

            response = await self.llm_repo.generate_response(prompt=prompt)

            # Extract content between <updated_session_memory> tags
            match = re.search(r'<updated_session_memory>(.*?)</updated_session_memory>', response, re.DOTALL)
            if match:
                SESSION_MEMORY = match.group(1).strip()
                print("[Maestro] Session memory updated.")
            else:
                # Fallback if tags are missing but there's content
                SESSION_MEMORY = response.strip()
                print("[Maestro] Session memory updated (tags missing).")

            # ── Persist to DB ────────
            if session_id:
                try:
                    self.persistence_repo.update_session_memory(session_id, SESSION_MEMORY)

                    # On forced update (like close), save everything. 
                    # Otherwise, save everything except the last 5 we keep in memory.
                    to_persist = messages[:] if force else (messages[:-5] if len(messages) > 5 else [])
                    if to_persist:
                        self.persistence_repo.upsert_conversation_history(session_id, to_persist)
                except Exception as e:
                    print(f"[Maestro] WARNING – persistence error during update_memory: {e}")

            # Keep only the last 5 messages to save context space,
            # as the previous context is now in SESSION_MEMORY
            messages[:] = [] if force else messages[-5:]

        return TURN_COUNTER, SESSION_MEMORY

    @staticmethod
    def format_history(conversation_array : List[Dict[str, str]]) -> str:
        formatted_str = ""
        for entry in conversation_array:
            role = "Student" if entry["role"] == "user" else "Tutor"
            content = entry["input"]
            formatted_str += f"{role} : {content}\n"
        return formatted_str
