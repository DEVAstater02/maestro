import os
import re
import json
from typing import Tuple, List, Dict, Optional
from app.repositories import claude, gemini, openai_repo
from app.repositories.persistence_repo import PersistenceRepository
from app.prompts.session_memory import SESSION_MEMORY_PROMPT
from app.prompts.prompts import PERSONA_UPDATE_PROMPT, PERSONA_BOOTSTRAP_PROMPT

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
    ) -> Tuple[int, str, Optional[int]]:
        new_chapter_index = None

        if (TURN_COUNTER >= 10 or force) and messages:
            print(f"[Maestro] Updating session memory using {provider or self.default_provider}...")
            repo = self._get_repo(provider)
            TURN_COUNTER = 0

            prompt = SESSION_MEMORY_PROMPT.format(
                CURRENT_SESSION_MEMORY=SESSION_MEMORY,
                CONVERSATION_MESSAGES=self.format_history(messages)
            )

            response = await repo.generate_response(prompt=prompt)

            # Extract <updated_session_memory> block
            match = re.search(r'<updated_session_memory>(.*?)</updated_session_memory>', response, re.DOTALL)
            if match:
                SESSION_MEMORY = match.group(1).strip()
                print("[Maestro] Session memory updated.")
            else:
                SESSION_MEMORY = response.strip()
                print("[Maestro] Session memory updated (tags missing).")

            # Extract <progress> block for chapter index recovery
            progress_match = re.search(r'<progress>(\{.*?\})</progress>', response, re.DOTALL)
            if progress_match:
                try:
                    new_chapter_index = json.loads(progress_match.group(1)).get("chapter_index")
                    print(f"[Maestro] Progress from memory: chapter_index={new_chapter_index}")
                except Exception:
                    pass

            # ── Persist to DB ────────
            if session_id:
                try:
                    self.persistence_repo.update_session_memory(session_id, SESSION_MEMORY)

                    to_persist = messages[:] if force else (messages[:-5] if len(messages) > 5 else [])
                    if to_persist:
                        self.persistence_repo.upsert_conversation_history(session_id, to_persist)
                except Exception as e:
                    print(f"[Maestro] WARNING – persistence error during update_memory: {e}")

            messages[:] = [] if force else messages[-5:]

        return TURN_COUNTER, SESSION_MEMORY, new_chapter_index

    async def update_persona_notes(
        self,
        user_id: str,
        user_record,
        messages: List[Dict[str, str]],
        session_memory: str = "",
        provider: str = None,
    ) -> None:
        """LLM-refresh prose persona notes and persist to users table. Fire-and-forget safe."""
        if not messages:
            return
        repo = self._get_repo(provider)
        prompt = PERSONA_UPDATE_PROMPT.format(
            CURRENT_PERSONA_NOTES=user_record.persona_notes or "None yet.",
            LEARNING_STYLE=user_record.learning_style or "Unknown",
            REASONING_SPEED=user_record.reasoning_speed or "Unknown",
            GRADE=user_record.grade or "Unknown",
            INTERESTS=user_record.interests or "Unknown",
            SESSION_MEMORY=session_memory or "Not available.",
            CONVERSATION_MESSAGES=self.format_history(messages),
        )
        try:
            response = await repo.generate_response(prompt=prompt, max_tokens=300)
            match = re.search(r'<updated_persona_notes>(.*?)</updated_persona_notes>', response, re.DOTALL)
            if match:
                notes = match.group(1).strip()
                self.persistence_repo.update_persona_notes(user_id, notes)
                user_record.persona_notes = notes
                print(f"[Maestro] Persona notes updated for user {user_id}")
            else:
                print("[Maestro] WARNING: persona update LLM returned no tags")
        except Exception as e:
            print(f"[Maestro] WARNING: persona notes update failed: {e}")

    async def bootstrap_knowledge_map(
        self,
        user_id: str,
        messages,
        subject: str,
        provider: str = None,
    ) -> None:
        """LLM-infer prior knowledge from curation conversation and persist. Fire-and-forget safe."""
        repo = self._get_repo(provider)
        if isinstance(messages, list) and messages and isinstance(messages[0], dict):
            conversation_text = self.format_history(messages)
        else:
            conversation_text = "\n".join(str(m) for m in messages)
        prompt = PERSONA_BOOTSTRAP_PROMPT.format(
            SUBJECT=subject,
            CONVERSATION=conversation_text,
        )
        try:
            response = await repo.generate_response(prompt=prompt, max_tokens=400)
            match = re.search(r'<knowledge_map>(.*?)</knowledge_map>', response, re.DOTALL)
            if match:
                entries = json.loads(match.group(1).strip())
                for entry in entries:
                    subj = entry.get("subject", "").strip().lower()
                    score = int(entry.get("score", 0))
                    if subj:
                        self.persistence_repo.upsert_prior_knowledge(user_id, subj, score)
                print(f"[Maestro] Knowledge map bootstrapped for user {user_id}: {len(entries)} entries")
            else:
                print("[Maestro] WARNING: bootstrap LLM returned no <knowledge_map> tags")
        except Exception as e:
            print(f"[Maestro] WARNING: knowledge map bootstrap failed: {e}")

    @staticmethod
    def format_history(conversation_array : List[Dict[str, str]]) -> str:
        formatted_str = ""
        for entry in conversation_array:
            role = "Student" if entry["role"] == "user" else "Tutor"
            content = entry["input"]
            formatted_str += f"{role} : {content}\n"
        return formatted_str
