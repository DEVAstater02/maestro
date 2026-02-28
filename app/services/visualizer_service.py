import json
import re
from app.prompts.visualiser import VISUALISER_PROMPT

class VisualizerService:
    def __init__(self, llm_repo):
        """
        Initialize the VisualizerService with an LLM repository.
        
        Args:
            llm_repo: An instance of a repository (e.g., ClaudeRepository or GeminiRepository)
                      that supports generate_response and optionally generate_structured_response.
        """
        self.llm_repo = llm_repo

    def sanitize_mermaid(self, diagram: str) -> str:
        """Fix common Mermaid syntax issues that LLMs produce."""
        if not diagram:
            return diagram

        lines = diagram.split("\n")
        sanitized = []

        for line in lines:
            # Fix unquoted labels in square brackets: A[Label Text] -> A["Label Text"]
            # But skip already-quoted labels: A["Label Text"]
            line = re.sub(
                r'\[([^\]"]+)\]',
                lambda m: f'["{m.group(1)}"]' if not m.group(1).startswith('"') else m.group(0),
                line
            )
            
            # Fix unquoted labels in arrow labels: -->|label| -> -->|"label"|
            line = re.sub(
                r'\|([^"|]+)\|',
                lambda m: f'|"{m.group(1)}"|',
                line
            )

            sanitized.append(line)

        return "\n".join(sanitized)

    async def generate_visualisation(self, user_input: str, tutor_response: str):
        """
        Generate a visualisation (Mermaid or structured JSON) based on the conversation.
        
        Args:
            user_input (str): The student's input.
            tutor_response (str): The tutor's response.
            
        Returns:
            dict: {
                "type": "visualisation",
                "format": "structured",
                "data": vis_data
            } or None
        """
        try:
            print("[Visualizer] Generating visualisation...")
            visualiser_to_llm = VISUALISER_PROMPT.format(
                USER_INPUT=user_input,
                TUTOR_RESPONSE=tutor_response
            )
            
            vis_data = None
            
            # Use structured output if the LLM repo supports it (Gemini)
            if hasattr(self.llm_repo, 'generate_structured_response'):
                from app.models.user_models import VisualisationResponse
                result = await self.llm_repo.generate_structured_response(
                    prompt=visualiser_to_llm,
                    response_schema=VisualisationResponse,
                )
                if result:
                    vis_data = result.model_dump(exclude_none=True)
                    print(f"[Visualizer] Structured output from Gemini: {vis_data.get('title', 'N/A')}")
            else:
                # Fallback for Claude: parse raw text as JSON
                raw_visualisation = await self.llm_repo.generate_response(visualiser_to_llm)
                print(f"[Visualizer] Raw output received (len: {len(raw_visualisation)})")
                
                if raw_visualisation and raw_visualisation.strip():
                    cleaned = raw_visualisation.strip()
                    if cleaned.startswith("```"):
                        lines = cleaned.split("\n")
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].strip() == "```":
                            lines = lines[:-1]
                        cleaned = "\n".join(lines).strip()
                    try:
                        vis_data = json.loads(cleaned)
                    except json.JSONDecodeError:
                        print("[Visualizer] JSON parse failed for visualisation")
            
            # Sanitize the Mermaid diagram regardless of source
            if vis_data and "diagram" in vis_data and vis_data["diagram"]:
                original = vis_data["diagram"]
                vis_data["diagram"] = self.sanitize_mermaid(original)
                if original != vis_data["diagram"]:
                    print("[Visualizer] Sanitized Mermaid diagram")
            
            if vis_data:
                return {
                    "type": "visualisation",
                    "format": "structured",
                    "data": vis_data
                }
            
            return None
                
        except Exception as e:
            print(f"[Visualizer] Error generating visualisation: {e}")
            return None
