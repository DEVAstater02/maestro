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

    async def generate_visualisation(self, user_input: str, tutor_response: str, subject: str = "Computer Science"):
        """
        Generate a dynamic visualisation based on the conversation.
        Uses the LLM to pick the best vis_type and populate its data.
        
        Returns:
            dict: {
                "type": "visualisation",
                "vis_type": "concept_card" | "stepped_process" | "data_point" | "code_snippet" | "spatial_map" | "decision_path" | "live_sim",
                "data": { ... type-specific data ... }
            } or None
        """
        try:
            print("[Visualizer] Generating dynamic visualisation...")
            visualiser_user_prompt = VISUALISER_USER_CONTEXT.format(
                USER_INPUT=user_input,
                TUTOR_RESPONSE=tutor_response,
                SUBJECT=subject
            )
            
            vis_data = None
            
            # Use structured output if the LLM repo supports it (Gemini)
            if hasattr(self.llm_repo, 'generate_structured_response'):
                from app.models.user_models import DynamicVisualisationResponse
                result = await self.llm_repo.generate_structured_response(
                    prompt=visualiser_user_prompt,
                    response_schema=DynamicVisualisationResponse,
                )
                if result:
                    vis_data = result.model_dump(exclude_none=True)
                    print(f"[Visualizer] Structured output — vis_type: {vis_data.get('vis_type', 'N/A')}")
            else:
                # Fallback for Claude: parse raw text as JSON
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
            
            if not vis_data:
                return None
                
            vis_type = vis_data.get("vis_type", "none")

            # Backward compat during rollout of the new spatial renderer
            if vis_type == "full_system_map":
                vis_type = "spatial_map"
                if "spatial_map" not in vis_data and "full_system_map" in vis_data:
                    vis_data["spatial_map"] = vis_data["full_system_map"]
            
            # Skip if no visual needed
            if vis_type == "none":
                print("[Visualizer] No visual needed for this response")
                return None
            
            # Extract the type-specific data
            type_data = vis_data.get(vis_type)
            if not type_data:
                print(f"[Visualizer] vis_type '{vis_type}' selected but no matching data found")
                return None
            
            return {
                "type": "visualisation",
                "vis_type": vis_type,
                "data": type_data
            }
                
        except Exception as e:
            print(f"[Visualizer] Error generating visualisation: {e}")
            return None
