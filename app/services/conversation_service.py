import os
import re
from typing import Tuple, List, Dict, Optional
from app.repositories import claude, gemini, openai_repo
from app.repositories.persistence_repo import PersistenceRepository
from app.prompts.session_memory import SESSION_MEMORY_PROMPT

class ConversationService:
    def __init__(self, default_provider: str = None):
        self.persistence_repo = PersistenceRepository()
        
        # Determine default LLM Provider
        self.default_provider = default_provider or os.getenv("LLM_PROVIDER", "claude").lower()
        print(f"[ConversationService] Initialized with default provider: {self.default_provider}")
        
        # Cache for repositories (Lazy Loading)
        self._repos = {}

    def _get_repo(self, provider: str = None):
        """Get or create a repo for the given provider."""
        effective = (provider or self.default_provider).lower()
        
        if effective in self._repos:
            return self._repos[effective]
            
        if effective == "gemini":
            repo = gemini.GeminiRepository()
        elif effective == "claude":
            repo = claude.ClaudeRepository()
        elif effective == "openai":
            repo = openai_repo.OpenAIRepository()
        else:
            raise ValueError(
                f"Unknown LLM provider '{effective}'. "
                "Supported values: 'claude', 'gemini', 'openai'"
            )
            
        self._repos[effective] = repo
        return repo

    def get_llm_repo(self, provider: str = None):
        """Returns the active LLM repository instance for services that need it directly (e.g. VisualizerService)"""
        return self._get_repo(provider)

    def create_session(self, user_id: str, syllabus_id: str = None) -> str:
        return self.persistence_repo.create_session(user_id=user_id, syllabus_id=syllabus_id)

    def get_session(self, session_id: str) -> Optional[Dict]:
        return self.persistence_repo.get_session(session_id)

    def get_syllabus(self, syllabus_id: str) -> Optional[Dict]:
        return self.persistence_repo.get_syllabus(syllabus_id)

    def get_latest_session(self, user_id: str = None, syllabus_id: str = None) -> Optional[Dict]:
        return self.persistence_repo.get_latest_session(user_id, syllabus_id)

    async def stream_response(self, prompt: str, system_prompt: str = None, max_tokens: int = 1536, provider: str = None):
        repo = self._get_repo(provider)
        async for chunk in repo.stream_response(prompt=prompt, system_prompt=system_prompt, max_tokens=max_tokens):
            yield chunk

    async def generate_response(self, prompt: str, system_prompt: str = None, max_tokens: int = 1536, provider: str = None) -> str:
        repo = self._get_repo(provider)
        return await repo.generate_response(prompt=prompt, system_prompt=system_prompt, max_tokens=max_tokens)

    async def update_memory(
        self,
        messages: List[Dict[str, str]],
        TURN_COUNTER: int,
        SESSION_MEMORY: str,
        session_id: str = None,
        force: bool = False,
        provider: str = None
    ) -> Tuple[int, str]:
        if (TURN_COUNTER >= 10 or force) and messages:
            print(f"[Maestro] Updating session memory using {provider or self.default_provider}...")
            repo = self._get_repo(provider)
            TURN_COUNTER = 0

            prompt = SESSION_MEMORY_PROMPT.format(
                CURRENT_SESSION_MEMORY=SESSION_MEMORY,
                CONVERSATION_MESSAGES=self.format_history(messages)
            )

            response = await repo.generate_response(prompt=prompt)

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
