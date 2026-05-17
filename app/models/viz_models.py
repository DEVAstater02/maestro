from pydantic import BaseModel, Field
from typing import Annotated, Dict, List, Literal, Optional, Union
import uuid


class ClassifierOutput(BaseModel):
    viz_type: Optional[str] = Field(
        default=None,
        description="The chosen visualization type, or null if none is needed"
    )
    reasoning: str = Field(description="One sentence explaining the choice")


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


# ─── Shared edge model ───

class FlowEdgeModel(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    target: str
    label: Optional[str] = None


# ─── Flowchart ───

class FlowNodeModel(BaseModel):
    id: str
    label: str
    type: Optional[Literal['input', 'output', 'llm', 'tool', 'default']] = 'default'


class FlowchartData(BaseModel):
    nodes: List[FlowNodeModel]
    edges: List[FlowEdgeModel]


class FlowchartViz(BaseModel):
    type: Literal['flowchart']
    data: FlowchartData


# ─── Chart ───

class ChartData(BaseModel):
    chartType: Literal['bar', 'line', 'pie']
    xKey: str
    yKey: str
    rows: List[Dict[str, Union[str, int, float]]]


class ChartViz(BaseModel):
    type: Literal['chart']
    data: ChartData


# ─── Network ───

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


# ─── Mermaid ───

class MermaidData(BaseModel):
    syntax: str


class MermaidViz(BaseModel):
    type: Literal['mermaid']
    data: MermaidData


# ─── Timeline ───

class TimelineEvent(BaseModel):
    date: str
    title: str
    description: str
    category: Optional[str] = None


class TimelineData(BaseModel):
    events: List[TimelineEvent]
    axis_label: Optional[str] = None


class TimelineViz(BaseModel):
    type: Literal['timeline']
    data: TimelineData


# ─── Tree ───

class TreeNode(BaseModel):
    id: str
    label: str
    children: Optional[List['TreeNode']] = []
    note: Optional[str] = None


TreeNode.model_rebuild()


class TreeData(BaseModel):
    root: TreeNode
    direction: Literal['top-down', 'left-right'] = 'top-down'


class TreeViz(BaseModel):
    type: Literal['tree']
    data: TreeData


# ─── Stepper ───

class Step(BaseModel):
    number: int
    title: str
    description: str
    code_snippet: Optional[str] = None
    note: Optional[str] = None


class StepperData(BaseModel):
    steps: List[Step]
    orientation: Literal['vertical', 'horizontal'] = 'vertical'


class StepperViz(BaseModel):
    type: Literal['stepper']
    data: StepperData


# ─── Table ───

class TableData(BaseModel):
    headers: List[str]
    rows: List[List[str]]
    caption: Optional[str] = None
    highlight_col: Optional[int] = None


class TableViz(BaseModel):
    type: Literal['table']
    data: TableData


# ─── MindMap ───

class MindMapNode(BaseModel):
    id: str
    label: str
    children: Optional[List['MindMapNode']] = []


MindMapNode.model_rebuild()


class MindMapData(BaseModel):
    central_topic: str
    branches: List[MindMapNode]


class MindMapViz(BaseModel):
    type: Literal['mindmap']
    data: MindMapData


# ─── Latex ───

class LatexBlock(BaseModel):
    expression: str
    label: Optional[str] = None
    annotation: Optional[str] = None


class LatexData(BaseModel):
    blocks: List[LatexBlock]
    context: Optional[str] = None


class LatexViz(BaseModel):
    type: Literal['latex']
    data: LatexData


# ─── Plotter ───

class PlotFunction(BaseModel):
    expression: str
    label: str
    color: Optional[str] = None


class PlotterData(BaseModel):
    functions: List[PlotFunction]
    x_range: List[float]
    y_range: Optional[List[float]] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None


class PlotterViz(BaseModel):
    type: Literal['plotter']
    data: PlotterData


# ─── Analogy ───

class AnalogyPanel(BaseModel):
    concept: str
    metaphor: str
    points: List[str]


class AnalogyData(BaseModel):
    left: AnalogyPanel
    right: AnalogyPanel
    connection_label: str


class AnalogyViz(BaseModel):
    type: Literal['analogy']
    data: AnalogyData


# ─── Code ───

class CodeData(BaseModel):
    language: str
    code: str
    highlight_lines: Optional[List[int]] = None
    caption: Optional[str] = None


class CodeViz(BaseModel):
    type: Literal['code']
    data: CodeData


# ─── Quiz ───

class QuizOption(BaseModel):
    label: str
    text: str  # e.g. "A", "B", "C", "D"


class QuizData(BaseModel):
    question: str
    options: List[QuizOption]
    correct_index: int  # 0-indexed
    explanation: str


class QuizViz(BaseModel):
    type: Literal['quiz']
    data: QuizData


# ─── Venn ───

class VennSet(BaseModel):
    label: str
    items: List[str]  # items unique to this set


class VennData(BaseModel):
    sets: List[VennSet]          # 2 or 3 sets
    overlaps: List[List[str]]    # overlaps[0] = A∩B, overlaps[1] = A∩C, overlaps[2] = B∩C, overlaps[3] = A∩B∩C (3-set only)
    caption: Optional[str] = None


class VennViz(BaseModel):
    type: Literal['venn']
    data: VennData


# ─── Array Trace ───

class ArrayStep(BaseModel):
    label: str                          # step description e.g. "Compare i=2, j=4"
    cells: List[str]                    # cell values as strings
    highlighted: Optional[List[int]] = None   # 0-indexed highlighted cell indices
    pointers: Optional[Dict[str, int]] = None # e.g. {"i": 2, "j": 4}


class ArrayTraceData(BaseModel):
    steps: List[ArrayStep]
    caption: Optional[str] = None


class ArrayTraceViz(BaseModel):
    type: Literal['array_trace']
    data: ArrayTraceData


# ─── Quadrant ───

class QuadrantItem(BaseModel):
    label: str
    x: float   # -1.0 to 1.0 (left → right)
    y: float   # -1.0 to 1.0 (bottom → top)


class QuadrantData(BaseModel):
    x_label: str                     # horizontal axis label
    y_label: str                     # vertical axis label
    quadrant_labels: List[str]       # [top-left, top-right, bottom-left, bottom-right]
    items: List[QuadrantItem]


class QuadrantViz(BaseModel):
    type: Literal['quadrant']
    data: QuadrantData


# ─── Heatmap ───

class HeatmapData(BaseModel):
    row_labels: List[str]
    col_labels: List[str]
    values: List[List[float]]        # values[row][col]
    scale_label: Optional[str] = None


class HeatmapViz(BaseModel):
    type: Literal['heatmap']
    data: HeatmapData


# ─── Geometry ───

class GeometryShape(BaseModel):
    shape_type: Literal['circle', 'rect', 'line', 'polygon', 'vector', 'point']
    label: Optional[str] = None
    coords: List[float]              # interpretation depends on shape_type:
                                     # circle: [cx, cy, r]
                                     # rect: [x, y, w, h]
                                     # line/vector: [x1, y1, x2, y2]
                                     # polygon: [x1,y1, x2,y2, ...] flat
                                     # point: [x, y]
    color: Optional[str] = None
    dashed: Optional[bool] = False


class GeometryData(BaseModel):
    shapes: List[GeometryShape]
    show_axes: Optional[bool] = True
    viewbox: Optional[List[float]] = None  # [x, y, w, h] — defaults to auto-fit


class GeometryViz(BaseModel):
    type: Literal['geometry']
    data: GeometryData


# ─── Stack Trace ───

class StackOperation(BaseModel):
    op: Literal['push', 'pop', 'peek', 'enqueue', 'dequeue', 'none']
    value: Optional[str] = None


class StackStep(BaseModel):
    label: str                              # e.g. "push(5)"
    stack: List[str]                        # current state, top = last element
    operation: StackOperation
    highlighted: Optional[int] = None      # 0-indexed element to highlight


class StackTraceData(BaseModel):
    steps: List[StackStep]
    mode: Literal['stack', 'queue'] = 'stack'
    caption: Optional[str] = None


class StackTraceViz(BaseModel):
    type: Literal['stack_trace']
    data: StackTraceData


# ─── Truth Table ───

class TruthTableData(BaseModel):
    variables: List[str]                    # input variable names e.g. ["A", "B"]
    expressions: List[str]                  # output column names e.g. ["A AND B"]
    rows: List[Dict[str, bool]]             # each row maps name → bool
    highlight_col: Optional[str] = None     # expression name to highlight as primary output


class TruthTableViz(BaseModel):
    type: Literal['truth_table']
    data: TruthTableData


# ─── Number Line ───

class NumberLineMarker(BaseModel):
    value: float
    label: str
    color: Optional[str] = None
    filled: Optional[bool] = True          # False = open circle (strict inequality)


class NumberLineRange(BaseModel):
    start: float
    end: float
    label: Optional[str] = None
    color: Optional[str] = None
    include_start: Optional[bool] = True
    include_end: Optional[bool] = True


class NumberLineData(BaseModel):
    min: float
    max: float
    markers: Optional[List[NumberLineMarker]] = []
    ranges: Optional[List[NumberLineRange]] = []
    tick_interval: Optional[float] = None
    label: Optional[str] = None            # axis label e.g. "x"


class NumberLineViz(BaseModel):
    type: Literal['number_line']
    data: NumberLineData


# ─── Union discriminator ───

VizSpecModel = Annotated[
    Union[FlowchartViz, ChartViz, NetworkViz, MermaidViz,
          TimelineViz, TreeViz, StepperViz, TableViz, MindMapViz,
          LatexViz, PlotterViz, AnalogyViz, CodeViz,
          QuizViz, VennViz, ArrayTraceViz, QuadrantViz, HeatmapViz, GeometryViz,
          StackTraceViz, TruthTableViz, NumberLineViz],
    Field(discriminator='type')
]


class VisualisationResponse(BaseModel):
    title: str = Field(description="Short descriptive title of the concept being visualised")
    viz: Optional[VizSpecModel] = Field(default=None, description=(
        "Structured visualisation. Pick the single best type for the concept. "
        "Omit if no visual adds clarity."
    ))
    explanation: Optional[ExplanationBlock] = Field(default=None, description="Code explanation block with pseudocode")
    keyPoints: Optional[List[KeyPoint]] = Field(default=None, description="2-3 key concepts that aid understanding")
    examples: Optional[List[Example]] = Field(default=None, description="Concrete examples with input/output, only if pedagogically useful")
    footnote: Optional[str] = Field(default=None, description="Optional caveat or extra context")
