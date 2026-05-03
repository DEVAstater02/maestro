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
        is_sequence = header.startswith("sequencediagram")

        sanitized = []

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            # Remove trailing semicolons which can break some Mermaid versions
            trimmed = trimmed.rstrip(';')

            if is_sequence:
                # -> (no arrowhead) → ->> (with arrowhead); leave ->> and --> untouched
                trimmed = re.sub(r'->(?!>)', '->>', trimmed)

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

    async def generate_visualisation(self, user_input: str, tutor_response: str, subject: str = "Computer Science"):
        try:
            print("[Visualizer] Generating visualisation...")
            visualiser_user_prompt = VISUALISER_USER_CONTEXT.format(
                USER_INPUT=user_input,
                TUTOR_RESPONSE=tutor_response,
                SUBJECT=subject
            )

            vis_data = None

            if hasattr(self.llm_repo, 'generate_structured_response'):
                from app.models.user_models import VisualisationResponse
                result = await self.llm_repo.generate_structured_response(
                    prompt=visualiser_user_prompt,
                    response_schema=VisualisationResponse,
                    system_prompt=VISUALISER_SYSTEM_PROMPT,
                )
                if result:
                    vis_data = result.model_dump(exclude_none=True)
                    print(f"[Visualizer] Structured output: {vis_data.get('title', 'N/A')}")
            else:
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

            # sanitize mermaid syntax if viz type is mermaid
            if vis_data:
                viz = vis_data.get("viz")
                if viz and viz.get("type") == "mermaid":
                    syntax = viz.get("data", {}).get("syntax", "")
                    if syntax:
                        viz["data"]["syntax"] = self.sanitize_mermaid(syntax)
                        print("[Visualizer] Sanitized Mermaid syntax")

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
