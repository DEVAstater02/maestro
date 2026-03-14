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
        try:
            # 1. Look for JSON in <json_output> tags (priority as per prompt)
            json_tags_match = re.search(r'<json_output>\s*({.*})\s*</json_output>', response_text, re.DOTALL)
            if json_tags_match:
                try:
                    return json.loads(json_tags_match.group(1).strip())
                except:
                    pass

            # 2. Look for JSON in markdown code blocks
            json_code_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', response_text, re.DOTALL)
            if json_code_match:
                try:
                    return json.loads(json_code_match.group(1).strip())
                except:
                    pass
            
            # 3. Fallback: find anything between the first { and last }
            json_match = re.search(r'(\{.*\})', response_text, re.DOTALL)
            if json_match:
                cleaned_text = json_match.group(1).strip()
                return json.loads(cleaned_text)
            else:
                print(f"[SyllabusService] No JSON found in response: {response_text[:200]}...")
                return {"raw_response": response_text}
                
        except json.JSONDecodeError as e:
            # Last ditch effort: if it failed because of single quotes, try to handle it
            # This handles cases where the LLM uses single quotes like a Python dict
            try:
                # Use a safer regex-based substitute or just try replace
                # Only if it looks like the issue is single quotes
                if "Expecting property name enclosed in double quotes" in str(e):
                    # Find the content again
                    fallback_match = re.search(r'(\{.*\})', response_text, re.DOTALL)
                    if fallback_match:
                        cleaned = fallback_match.group(1).strip().replace("'", '"')
                        return json.loads(cleaned)
            except:
                pass
            
            print(f"[SyllabusService] JSON parse error: {e}")
            return {
                "error": "Failed to parse syllabus JSON",
                "raw_response": response_text
            }
        except Exception as e:
            print(f"[SyllabusService] Error: {e}")
            return {"error": str(e), "raw_response": response_text}

    def list_syllabuses(self, user_id: str) -> List[dict]:
        return self.persistence_repo.get_syllabuses_by_user(user_id)

    def store_syllabus(self, user_id: str, title: str, content_json: dict) -> str:
        return self.persistence_repo.store_syllabus(user_id, title, content_json)
