import re
from app.prompts.visualiser import (
    CLASSIFIER_SYSTEM_PROMPT,
    CLASSIFIER_USER_CONTEXT,
    VISUALISER_USER_CONTEXT,
)
from app.services.visualizer_registry import VIZ_REGISTRY


class VisualizerService:
    def __init__(self, llm_repo):
        self.llm_repo = llm_repo

    def sanitize_mermaid(self, diagram: str) -> str:
        if not diagram:
            return diagram

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
            trimmed = trimmed.rstrip(';')

            if is_sequence:
                trimmed = re.sub(r'->(?!>)', '->>', trimmed)

            if is_flowchart:
                trimmed = re.sub(r'\{\{([^\"\}]+)\}\}', r'{{"\1"}}', trimmed)
                trimmed = re.sub(r'\(\[([^\"\]]+)\]\)', r'(["\1"])', trimmed)
                trimmed = re.sub(r'\[\[([^\"\]]+)\]\]', r'[["\1"]]', trimmed)
                trimmed = re.sub(r'\(\(([^\" \)]+)\)\)', r'(("\1"))', trimmed)
                trimmed = re.sub(r'\[\(([^\" \)]+)\)\]', r'[("\1")]', trimmed)
                trimmed = re.sub(r'(?<!\[)\[([^\"\]]+)\](?!\])', r'["\1"]', trimmed)
                trimmed = re.sub(r'(?<!\{)\{([^\"\}]+)\}(?!\})', r'{"\1"}', trimmed)
                trimmed = re.sub(r'([a-zA-Z0-9_]+)\(([^\" \)]+)\)', r'\1("\2")', trimmed)
                trimmed = re.sub(r'\|([^\"\|]+)\|', r'|"\1"|', trimmed)
                trimmed = re.sub(r'([a-zA-Z0-9_]+)(\[.*?\]|\{.*?\}|\(.*?\))[\]\}\)]*[a-zA-Z0-9_]*', r'\1\2', trimmed)

            sanitized.append(trimmed)

        return "\n".join(sanitized)

    async def _classify(self, user_input: str, tutor_response: str, subject: str) -> str | None:
        type_list = "\n".join(
            f"- {name}: {entry['description']}"
            for name, entry in VIZ_REGISTRY.items()
        )
        user_prompt = CLASSIFIER_USER_CONTEXT.format(
            USER_INPUT=user_input,
            TUTOR_RESPONSE=tutor_response,
            SUBJECT=subject,
            TYPE_LIST=type_list,
        )
        from app.models.viz_models import ClassifierOutput
        result = await self.llm_repo.generate_structured_response(
            prompt=user_prompt,
            response_schema=ClassifierOutput,
            system_prompt=CLASSIFIER_SYSTEM_PROMPT,
        )
        if not result or not result.viz_type:
            print("[Visualizer] Classifier: no visualization needed")
            return None
        viz_type = result.viz_type.lower()
        if viz_type not in VIZ_REGISTRY:
            print(f"[Visualizer] Classifier returned unknown type: {viz_type}")
            return None
        print(f"[Visualizer] Classifier chose: {viz_type} — {result.reasoning}")
        return viz_type

    async def _generate(self, viz_type: str, user_input: str, tutor_response: str, subject: str) -> dict | None:
        entry = VIZ_REGISTRY[viz_type]
        user_prompt = VISUALISER_USER_CONTEXT.format(
            USER_INPUT=user_input,
            TUTOR_RESPONSE=tutor_response,
            SUBJECT=subject,
        )
        from app.models.viz_models import VisualisationResponse
        result = await self.llm_repo.generate_structured_response(
            prompt=user_prompt,
            response_schema=VisualisationResponse,
            system_prompt=entry["system_prompt"],
        )
        if not result:
            print(f"[Visualizer] Generator returned nothing for type: {viz_type}")
            return None
        print(f"[Visualizer] Generated: {result.title!r}")
        return result.model_dump(exclude_none=True)

    async def generate_visualisation(self, user_input: str, tutor_response: str, subject: str = "Computer Science"):
        try:
            if not hasattr(self.llm_repo, 'generate_structured_response'):
                print("[Visualizer] LLM repo has no generate_structured_response — skipping")
                return None

            viz_type = await self._classify(user_input, tutor_response, subject)
            if not viz_type:
                return None

            vis_data = await self._generate(viz_type, user_input, tutor_response, subject)
            if not vis_data:
                return None

            if viz_type == "mermaid":
                viz = vis_data.get("viz", {})
                syntax = viz.get("data", {}).get("syntax", "")
                if syntax:
                    vis_data["viz"]["data"]["syntax"] = self.sanitize_mermaid(syntax)
                    print("[Visualizer] Sanitized Mermaid syntax")

            return {
                "type": "visualisation",
                "format": "structured",
                "data": vis_data,
            }

        except Exception as e:
            print(f"[Visualizer] Error: {e}")
            return None
