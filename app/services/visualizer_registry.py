from app.models.viz_models import (
    FlowchartViz, ChartViz, NetworkViz, MermaidViz,
    TimelineViz, TreeViz, StepperViz, TableViz, MindMapViz,
    LatexViz, PlotterViz, AnalogyViz, CodeViz,
    QuizViz, VennViz, ArrayTraceViz, QuadrantViz, HeatmapViz, GeometryViz,
)
from app.prompts.visualiser import (
    FLOWCHART_GENERATOR_PROMPT,
    CHART_GENERATOR_PROMPT,
    NETWORK_GENERATOR_PROMPT,
    MERMAID_GENERATOR_PROMPT,
    TIMELINE_GENERATOR_PROMPT,
    TREE_GENERATOR_PROMPT,
    STEPPER_GENERATOR_PROMPT,
    TABLE_GENERATOR_PROMPT,
    MINDMAP_GENERATOR_PROMPT,
    LATEX_GENERATOR_PROMPT,
    PLOTTER_GENERATOR_PROMPT,
    ANALOGY_GENERATOR_PROMPT,
    CODE_GENERATOR_PROMPT,
    QUIZ_GENERATOR_PROMPT,
    VENN_GENERATOR_PROMPT,
    ARRAY_TRACE_GENERATOR_PROMPT,
    QUADRANT_GENERATOR_PROMPT,
    HEATMAP_GENERATOR_PROMPT,
    GEOMETRY_GENERATOR_PROMPT,
)

VIZ_REGISTRY = {
    "flowchart": {
        "description": "Step-by-step process, algorithm, or decision tree (3–6 nodes)",
        "schema": FlowchartViz,
        "system_prompt": FLOWCHART_GENERATOR_PROMPT,
    },
    "chart": {
        "description": "Numerical comparisons, trends, distributions — bar, line, or pie",
        "schema": ChartViz,
        "system_prompt": CHART_GENERATOR_PROMPT,
    },
    "network": {
        "description": "Relationships or dependencies between concepts (nodes and edges)",
        "schema": NetworkViz,
        "system_prompt": NETWORK_GENERATOR_PROMPT,
    },
    "mermaid": {
        "description": "Sequence diagrams, class diagrams, or state diagrams only",
        "schema": MermaidViz,
        "system_prompt": MERMAID_GENERATOR_PROMPT,
    },
    "timeline": {
        "description": "Ordered events or milestones over time — history, biography, evolution",
        "schema": TimelineViz,
        "system_prompt": TIMELINE_GENERATOR_PROMPT,
    },
    "tree": {
        "description": "Hierarchical parent-child structure — taxonomy, org chart, inheritance",
        "schema": TreeViz,
        "system_prompt": TREE_GENERATOR_PROMPT,
    },
    "stepper": {
        "description": "Sequential numbered steps in a process or algorithm",
        "schema": StepperViz,
        "system_prompt": STEPPER_GENERATOR_PROMPT,
    },
    "table": {
        "description": "Side-by-side comparison of items across properties",
        "schema": TableViz,
        "system_prompt": TABLE_GENERATOR_PROMPT,
    },
    "mindmap": {
        "description": "Radial concept map around a central topic — brainstorming, topic overview",
        "schema": MindMapViz,
        "system_prompt": MINDMAP_GENERATOR_PROMPT,
    },
    "latex": {
        "description": "Mathematical or scientific equations — STEM formulas, derivations",
        "schema": LatexViz,
        "system_prompt": LATEX_GENERATOR_PROMPT,
    },
    "plotter": {
        "description": "Graph of a mathematical function f(x) — algebra, calculus, physics",
        "schema": PlotterViz,
        "system_prompt": PLOTTER_GENERATOR_PROMPT,
    },
    "analogy": {
        "description": "Two-panel comparison linking abstract concept to familiar real-world metaphor",
        "schema": AnalogyViz,
        "system_prompt": ANALOGY_GENERATOR_PROMPT,
    },
    "code": {
        "description": "Syntax-highlighted code snippet — programming concepts, algorithms, syntax examples",
        "schema": CodeViz,
        "system_prompt": CODE_GENERATOR_PROMPT,
    },
    "quiz": {
        "description": "Multiple-choice question to test understanding of the concept just taught",
        "schema": QuizViz,
        "system_prompt": QUIZ_GENERATOR_PROMPT,
    },
    "venn": {
        "description": "Overlapping circles showing shared and distinct properties of 2–3 concepts",
        "schema": VennViz,
        "system_prompt": VENN_GENERATOR_PROMPT,
    },
    "array_trace": {
        "description": "Step-by-step state of an array or list during an algorithm (sorting, pointer movement)",
        "schema": ArrayTraceViz,
        "system_prompt": ARRAY_TRACE_GENERATOR_PROMPT,
    },
    "quadrant": {
        "description": "2×2 grid categorising items across two axes — trade-offs, risk matrix, priority matrix",
        "schema": QuadrantViz,
        "system_prompt": QUADRANT_GENERATOR_PROMPT,
    },
    "heatmap": {
        "description": "Grid of cells coloured by intensity — confusion matrix, correlation table, frequency analysis",
        "schema": HeatmapViz,
        "system_prompt": HEATMAP_GENERATOR_PROMPT,
    },
    "geometry": {
        "description": "Labeled geometric shapes, vectors, or coordinate constructions — geometry, physics, trigonometry",
        "schema": GeometryViz,
        "system_prompt": GEOMETRY_GENERATOR_PROMPT,
    },
}
