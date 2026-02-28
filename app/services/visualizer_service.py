import json
from app.prompts.visualiser import VISUALISER_PROMPT
from app.repositories.claude import ClaudeRepository

class VisualizerService:
    def __init__(self, claude_repo: ClaudeRepository = None):
        self.claude_repo = claude_repo or ClaudeRepository()

    async def generate_visualisation(self, user_input: str, tutor_response: str):
        """
        Generate a visualisation (Mermaid or structured JSON) based on the conversation.
        
        Args:
            user_input (str): The student's input.
            tutor_response (str): The tutor's response.
            
        Returns:
            dict: A dictionary containing 'type', 'format', and 'data' for the visualisation.
        """
        try:
            print("Generating visualisation...")
            visualiser_to_llm = VISUALISER_PROMPT.format(
                USER_INPUT=user_input,
                TUTOR_RESPONSE=tutor_response
            )
            raw_visualisation = await self.claude_repo.generate_response(visualiser_to_llm)
            
            if not raw_visualisation or not raw_visualisation.strip():
                return None

            # Clean the response (strip markdown code blocks)
            cleaned = raw_visualisation.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()

            # Try to parse as structured JSON first
            try:
                vis_data = json.loads(cleaned)
                return {
                    "type": "visualisation",
                    "format": "structured",
                    "data": vis_data
                }
            except json.JSONDecodeError:
                # Fallback: treat as raw Mermaid code
                return {
                    "type": "visualisation",
                    "format": "mermaid",
                    "data": raw_visualisation.strip()
                }
                
        except Exception as e:
            print(f"Error in VisualizerService: {e}")
            raise
