import json
import re
from app.prompts.visualiser import VISUALISER_SYSTEM_PROMPT, VISUALISER_USER_CONTEXT

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

        # Remove markdown code blocks if present
        diagram = diagram.strip()
        if diagram.startswith('```'):
            diagram = re.sub(r'^```(mermaid)?\s*\n', '', diagram)
            diagram = re.sub(r'\n\s*```$', '', diagram)

        lines = diagram.split("\n")
        header = lines[0].lower().strip() if lines else ""
        is_flowchart = header.startswith("flowchart") or header.startswith("graph")
        
        sanitized = []

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue
                
            # Remove trailing semicolons which can break some Mermaid versions
            trimmed = trimmed.rstrip(';')

            if is_flowchart:
                # 1. Handle double brackets/braces/shapes first (more specific)
                # {{ label }} -> {{"label"}}
                trimmed = re.sub(r'\{\{([^\"\}]+)\}\}', r'{{"\1"}}', trimmed)
                # ([ label ]) -> (["label"])
                trimmed = re.sub(r'\(\[([^\"\]]+)\]\)', r'(["\1"])', trimmed)
                # [[ label ]] -> [["label"]]
                trimmed = re.sub(r'\[\[([^\"\]]+)\]\]', r'[["\1"]]', trimmed)
                # (( label )) -> (("label"))
                trimmed = re.sub(r'\(\(([^\" \)]+)\)\)', r'(("\1"))', trimmed)
                # [( label )] -> [("label")]
                trimmed = re.sub(r'\[\(([^\" \)]+)\)\]', r'[("\1")]', trimmed)

                # 2. Handle single brackets/parentheses if not already caught
                # [ label ] -> ["label"]
                trimmed = re.sub(r'(?<!\[)\[([^\"\]]+)\](?!\])', r'["\1"]', trimmed)
                # { label } -> {"label"}
                trimmed = re.sub(r'(?<!\{)\{([^\"\}]+)\}(?!\})', r'{"\1"}', trimmed)
                # ( label ) -> ("label") - only if attached to a node ID
                trimmed = re.sub(r'([a-zA-Z0-9_]+)\(([^\" \)]+)\)', r'\1("\2")', trimmed)

                # 3. Handle arrow labels: -->|label| -> -->|"label"|
                trimmed = re.sub(r'\|([^\"\|]+)\|', r'|"\1"|', trimmed)
                
                # 4. Cleanup hallucinated trailing characters and mismatched brackets after node definitions
                # (e.g. B{"label"}]B -> B{"label"})
                trimmed = re.sub(r'([a-zA-Z0-9_]+)(\[.*?\]|\{.*?\}|\(.*?\))[\]\}\)]*[a-zA-Z0-9_]*', r'\1\2', trimmed)

            sanitized.append(trimmed)

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
            visualiser_user_prompt = VISUALISER_USER_CONTEXT.format(
                USER_INPUT=user_input,
                TUTOR_RESPONSE=tutor_response
            )
            
            vis_data = None
            
            # Use structured output if the LLM repo supports it (Gemini)
            if hasattr(self.llm_repo, 'generate_structured_response'):
                from app.models.user_models import VisualisationResponse
                result = await self.llm_repo.generate_structured_response(
                    prompt=visualiser_user_prompt,
                    response_schema=VisualisationResponse,
                )
                if result:
                    vis_data = result.model_dump(exclude_none=True)
                    print(f"[Visualizer] Structured output from Gemini: {vis_data.get('title', 'N/A')}")
            else:
                # Fallback for Claude: parse raw text as JSON
                # Use system prompt for instructions and user prompt for context
                raw_visualisation = await self.llm_repo.generate_response(
                    prompt=visualiser_user_prompt,
                    system_prompt=VISUALISER_SYSTEM_PROMPT
                )
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
