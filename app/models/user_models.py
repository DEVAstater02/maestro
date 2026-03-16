from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import List, Optional
from datetime import date

class UserQuestionRequest(BaseModel):
    prompt : str

class UserQuestionResponse(BaseModel):
    model_config = ConfigDict(extra="allow")


# ─── Structured Visualisation Schema ───
# Used with Gemini's structured output to guarantee valid JSON responses

class ExplanationBlock(BaseModel):
    heading: str = Field(description="Short heading for the explanation section, e.g. 'How It Works'")
    code: str = Field(description="Python-style pseudocode explaining the concept. Use \\n for newlines, # for comments.")
    result: Optional[str] = Field(default=None, description="Key takeaway, final output, or formula")

class KeyPoint(BaseModel):
    title: str = Field(description="1-3 word title for the key concept")
    text: str = Field(description="1-2 sentence explanation of the concept")

class Example(BaseModel):
    label: Optional[str] = Field(default=None, description="Label for the example, e.g. 'Example 1'")
    input: str = Field(description="Example input")
    output: str = Field(description="Expected output")

class VisualisationResponse(BaseModel):
    title: str = Field(description="Short descriptive title of the concept being visualised")
    diagram: str = Field(description=(
        "Valid Mermaid.js diagram code. Choose the best type: "
        "flowchart TD/LR (for algorithms, processes, decisions), "
        "sequenceDiagram (for component interactions, API flows), "
        "classDiagram (for OOP design, domain models), or "
        "stateDiagram-v2 (for state machines, lifecycles). "
        "ALWAYS quote all node labels: A[\"Label\"], B{{\"Decision\"}}. "
        "Use \\n to separate lines. Keep to 4-10 nodes."
    ))
    explanation: Optional[ExplanationBlock] = Field(default=None, description="Code explanation block with pseudocode")
    keyPoints: Optional[List[KeyPoint]] = Field(default=None, description="2-3 key concepts that aid understanding")
    examples: Optional[List[Example]] = Field(default=None, description="Concrete examples with input/output, only if pedagogically useful")


# ─── Dynamic Visualisation Schemas (v2) ───

class MetadataField(BaseModel):
    label: str = Field(description="Metadata label, e.g. 'STATUS', 'TYPE', 'COMPLEXITY'")
    value: str = Field(description="Metadata value, e.g. 'ACTIVE', 'PROTOCOL', 'O(n)'")

class ConceptCardData(BaseModel):
    title: str = Field(description="Short uppercase title for the concept")
    definition: str = Field(description="Brief, clear definition of the concept (1-3 sentences)")
    metadata: Optional[List[MetadataField]] = Field(default=None, description="Optional metadata fields like STATUS, TYPE, etc.")

class ProcessStep(BaseModel):
    label: str = Field(description="Short label for this step")
    description: Optional[str] = Field(default=None, description="Optional brief description")

class SteppedProcessData(BaseModel):
    title: str = Field(description="Title of the process being explained")
    steps: List[ProcessStep] = Field(description="Ordered list of steps in the process")
    current_step_index: int = Field(default=0, description="Index of the step currently being discussed (0-based)")

class ComparisonData(BaseModel):
    label: str = Field(description="What is being compared, e.g. 'Previous', 'Industry Average'")
    value: str = Field(description="The comparison value")

class DataPointData(BaseModel):
    label: str = Field(description="Short uppercase label describing what the value represents")
    value: str = Field(description="The key value to display prominently, e.g. '200ms', 'ONLINE', '99.9%'")
    comparison: Optional[ComparisonData] = Field(default=None, description="Optional comparison data point")

class CodeSnippetData(BaseModel):
    language: str = Field(description="Programming language, e.g. 'python', 'javascript', 'go'")
    filename: str = Field(description="Filename or module name, e.g. 'handler.py', 'auth.js'")
    code: str = Field(description="The actual code to display. Use \\n for newlines.")

class SpatialMapNode(BaseModel):
    id: str = Field(description="Unique node ID")
    label: str = Field(description="Display label for the node")
    type: Optional[str] = Field(default=None, description="Optional node type like 'service', 'database', 'queue'")
    shape: Optional[str] = Field(default=None, description="Optional visual hint like 'orb' or 'hex'")

class SpatialMapLink(BaseModel):
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    label: Optional[str] = Field(default=None, description="Optional edge label")

class SpatialMapData(BaseModel):
    title: str = Field(description="Title of the system map")
    nodes: List[SpatialMapNode] = Field(description="List of system nodes")
    links: List[SpatialMapLink] = Field(description="List of curved light-trail connections between nodes")
    focus_node_id: Optional[str] = Field(default=None, description="The node currently being discussed and shown in sharp focus")

class DecisionNode(BaseModel):
    label: str = Field(description="The current question or decision point shown in the center")
    context: Optional[str] = Field(default=None, description="Optional short context line under the current node")

class DecisionOption(BaseModel):
    id: str = Field(description="Unique option ID")
    label: str = Field(description="Short label for the decision branch")
    description: Optional[str] = Field(default=None, description="Optional one-line explanation for this branch")

class DecisionPathData(BaseModel):
    current_node: DecisionNode = Field(description="The current decision prompt or follow-up question")
    options: List[DecisionOption] = Field(description="2-4 possible branches extending into the background")
    active_option_id: Optional[str] = Field(default=None, description="Optional option to highlight by default")

class SimulationParameter(BaseModel):
    name: str = Field(description="Parameter name used in the equation, e.g. 'm', 'b', 'g'")
    value: float = Field(description="Numeric value for the parameter")

class LiveSimData(BaseModel):
    equation: str = Field(description="A concise 2D equation to graph, ideally in terms of x, e.g. 'sin(x)', '2*x + 1', '0.5*x^2'")
    variables_to_watch: List[str] = Field(description="Variable or parameter names that should be surfaced in the UI")
    target_change: str = Field(description="Short phrase describing the change being demonstrated, e.g. 'increase amplitude' or 'compare steeper slope'")
    parameters: Optional[List[SimulationParameter]] = Field(default=None, description="Numeric parameter values if the equation references named constants besides x")

class DynamicVisualisationResponse(BaseModel):
    vis_type: str = Field(description=(
        "The type of visual to render. Must be one of: "
        "'concept_card', 'stepped_process', 'data_point', 'code_snippet', 'spatial_map', 'decision_path', 'live_sim', 'none'. "
        "Use 'none' if the response is purely conversational and no visual aids understanding."
    ))
    concept_card: Optional[ConceptCardData] = Field(default=None, description="Populated when vis_type is 'concept_card'")
    stepped_process: Optional[SteppedProcessData] = Field(default=None, description="Populated when vis_type is 'stepped_process'")
    data_point: Optional[DataPointData] = Field(default=None, description="Populated when vis_type is 'data_point'")
    code_snippet: Optional[CodeSnippetData] = Field(default=None, description="Populated when vis_type is 'code_snippet'")
    spatial_map: Optional[SpatialMapData] = Field(default=None, description="Populated when vis_type is 'spatial_map'")
    decision_path: Optional[DecisionPathData] = Field(default=None, description="Populated when vis_type is 'decision_path'")
    live_sim: Optional[LiveSimData] = Field(default=None, description="Populated when vis_type is 'live_sim'")


class SyllabusRequest(BaseModel):
    topic: str
    user_persona: str
    subject: str


# ─── Auth Models ───────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    dob: Optional[str] = None      # ISO date string YYYY-MM-DD
    grade: Optional[str] = None
    interests: Optional[str] = None


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str


class TokenData(BaseModel):
    user_id: str
    name: str
