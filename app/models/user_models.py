from pydantic import BaseModel, ConfigDict
from typing import Optional

# ─── Generic request/response models ───

class UserQuestionRequest(BaseModel):
    prompt: str


class UserQuestionResponse(BaseModel):
    model_config = ConfigDict(extra="allow")


class SyllabusRequest(BaseModel):
    topic: str
    user_persona: str
    subject: str


# ─── Re-exports for backwards compatibility ───
# Consumers should migrate to importing directly from viz_models / auth_models.

from app.models.viz_models import (  # noqa: F401, E402
    ClassifierOutput, ExplanationBlock, KeyPoint, Example,
    FlowEdgeModel, FlowNodeModel, FlowchartData, FlowchartViz,
    ChartData, ChartViz,
    NetworkNodeModel, NetworkData, NetworkViz,
    MermaidData, MermaidViz,
    TimelineEvent, TimelineData, TimelineViz,
    TreeNode, TreeData, TreeViz,
    Step, StepperData, StepperViz,
    TableData, TableViz,
    MindMapNode, MindMapData, MindMapViz,
    LatexBlock, LatexData, LatexViz,
    PlotFunction, PlotterData, PlotterViz,
    AnalogyPanel, AnalogyData, AnalogyViz,
    CodeData, CodeViz,
    VizSpecModel, VisualisationResponse,
)

from app.models.auth_models import (  # noqa: F401, E402
    SignupRequest, SigninRequest, AuthResponse, TokenData,
)
