from fastapi import APIRouter, HTTPException
from app.models.user_models import SyllabusRequest
from app.prompts.syllabus import SYLLABUS_GENERATION_PROMPT
from app.repositories.claude import ClaudeRepository
import json
import re

router = APIRouter()

@router.post("/generate_syllabus")
async def generate_syllabus(request: SyllabusRequest):
    """
    Generates a syllabus based on topic, user persona, and subject.
    Uses Claude LLM to generate the JSON structure.
    """
    try:
        claude_repo = ClaudeRepository()
        
        # Format the prompt with user inputs
        formatted_prompt = SYLLABUS_GENERATION_PROMPT.replace("{{TOPIC}}", request.topic)
        formatted_prompt = formatted_prompt.replace("{{USER_PERSONA}}", request.user_persona)
        formatted_prompt = formatted_prompt.replace("{{SUBJECT}}", request.subject)
        
        # Call Claude API
        # Using claude-3-5-sonnet-20240620 or similar high-quality model for structured output
        # Based on claude.py, it defaults to claude-haiku-4-5-20251001
        response_text = await claude_repo.generate_response(
            prompt=formatted_prompt,
            model="claude-sonnet-4-6" 
        )
        
        # Attempt to parse the response as JSON to ensure validity
        # The prompt specifically asks for JSON only
        # Try to find JSON in markdown code blocks first
        json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        # Fallback: find anything between the first { and last }
        json_match = re.search(r'(\{.*\})', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        else:
            return {"raw_response": response_text}

    except Exception as e:
        print(f"Error in generate_syllabus: {e}")
        raise HTTPException(status_code=500, detail=str(e))
