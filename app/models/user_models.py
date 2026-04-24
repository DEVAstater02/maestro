from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Annotated, Dict, List, Literal, Optional, Union
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

# ─── VizSpec models (mirror frontend types/visualizer.tsx) ───

class FlowNodeModel(BaseModel):
    id: str
    label: str
    type: Optional[Literal['input', 'output', 'llm', 'tool', 'default']] = 'default'

import uuid

class FlowEdgeModel(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    target: str
    label: Optional[str] = None

class FlowchartData(BaseModel):
    nodes: List[FlowNodeModel]
    edges: List[FlowEdgeModel]

class FlowchartViz(BaseModel):
    type: Literal['flowchart']
    data: FlowchartData

class ChartData(BaseModel):
    chartType: Literal['bar', 'line', 'pie']
    xKey: str
    yKey: str
    rows: List[Dict[str, Union[str, int, float]]]

class ChartViz(BaseModel):
    type: Literal['chart']
    data: ChartData

class NetworkNodeModel(BaseModel):
    id: str
    label: str
    group: Optional[str] = 'default'

class NetworkData(BaseModel):
    nodes: List[NetworkNodeModel]
    edges: List[FlowEdgeModel]

class NetworkViz(BaseModel):
    type: Literal['network']
    data: NetworkData

class MermaidData(BaseModel):
    syntax: str

class MermaidViz(BaseModel):
    type: Literal['mermaid']
    data: MermaidData

VizSpecModel = Annotated[
    Union[FlowchartViz, ChartViz, NetworkViz, MermaidViz],
    Field(discriminator='type')
]

class VisualisationResponse(BaseModel):
    title: str = Field(description="Short descriptive title of the concept being visualised")
    viz: Optional[VizSpecModel] = Field(default=None, description=(
        "Structured visualisation. Choose one type: "
        "'flowchart' (algorithms, processes, decision trees — 3-6 nodes), "
        "'chart' (numerical comparisons, trends — bar/line/pie), "
        "'network' (relationships between concepts), "
        "'mermaid' (sequence/class/state diagrams only). "
        "Omit if no visual adds clarity."
    ))
    explanation: Optional[ExplanationBlock] = Field(default=None, description="Code explanation block with pseudocode")
    keyPoints: Optional[List[KeyPoint]] = Field(default=None, description="2-3 key concepts that aid understanding")
    examples: Optional[List[Example]] = Field(default=None, description="Concrete examples with input/output, only if pedagogically useful")
    footnote: Optional[str] = Field(default=None, description="Optional caveat or extra context")

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
