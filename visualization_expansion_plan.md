# AI Tutor Visualization Expansion Plan

This document outlines a strategic plan for expanding the visualization capabilities of the Voice AI Tutor application. It details new visualization types to add, their pedagogical advantages, and a step-by-step implementation guide.

## Current Architecture
Currently, the application supports four visualization types registered in `visualizer_registry.py`:
1. `flowchart`: Algorithms, processes, decision trees.
2. `chart`: Numerical comparisons, trends (bar, line, pie).
3. `network`: Relationships between concepts.
4. `mermaid`: Sequence, class, and state diagrams.

## Proposed New Visualizations

### 1. Interactive Code Snippet / Diff View (`CodeViz`)
**Overview:** A dedicated code viewer with syntax highlighting, step-by-step execution highlighting, and diff capabilities.
* **Added Advantage:** Essential for programming and computer science tutoring. Instead of reading flat pseudocode in the `ExplanationBlock`, students can interact with the code, see execution flows, and visually identify changes in a function before and after a modification.
* **Use Cases:** Explaining algorithms, debugging code snippets, showing language syntax differences.

### 2. Math & Equation Renderer (`MathViz`)
**Overview:** A visualization type that renders LaTeX or MathML equations beautifully using KaTeX or MathJax.
* **Added Advantage:** Crucial for STEM tutoring. Replaces messy ASCII representations with textbook-quality mathematical and chemical equations. Enhances cognitive clarity when explaining formulas.
* **Use Cases:** Physics formulas (e.g., Kinematics), Calculus derivations, Chemical equations.

### 3. Comparison Table / Matrix (`TableViz`)
**Overview:** A structured grid to compare two or more subjects across various attributes or properties.
* **Added Advantage:** When comparing concepts, a table is far more readable and scannable than a conversational paragraph or a complex network graph. It allows for immediate visual cross-referencing.
* **Use Cases:** "Mitosis vs. Meiosis", "React vs. Vue", pros & cons lists, feature matrices.

### 4. Timeline / Sequence of Events (`TimelineViz`)
**Overview:** A visually appealing, interactive timeline component (horizontal or vertical) with clickable events.
* **Added Advantage:** Provides a clear spatial representation of chronological events. Helps students memorize the sequence and duration of events without parsing large blocks of text.
* **Use Cases:** History lessons (e.g., events of WWII), literature (character arcs across chapters), biological evolution.

### 5. Interactive Quiz / Flashcard (`QuizViz`)
**Overview:** An interactive component that renders a knowledge-check question, multiple-choice options, or a flip-able flashcard.
* **Added Advantage:** Shifts the learning experience from passive reading/listening to active recall. The AI tutor can generate a quick knowledge check, wait for user input (click or voice), and provide immediate feedback, which is proven to drastically improve retention.
* **Use Cases:** Vocabulary drills, quick concept checks mid-lesson, summative assessments.

### 6. Tree / Hierarchical Mind-Map (`TreeViz`)
**Overview:** A strict top-down or left-right tree structure (e.g., collapsible directory tree or taxonomy tree).
* **Added Advantage:** Ideal for breaking down complex topics into digestible sub-topics. Unlike general network graphs, tree structures are organized hierarchically, reducing cognitive load and allowing students to collapse/expand sections as needed.
* **Use Cases:** Biological classifications, organizational charts, grammar rules, essay outlines.

---

## Implementation Strategy

To add a new visualization to the system, follow these three core steps across the backend and frontend:

### Phase 1: Backend Data Modeling
Update `app/models/user_models.py` to define the schema for the new visualization type using Pydantic.
```python
# Example for TableViz
class TableData(BaseModel):
    headers: List[str]
    rows: List[List[str]]

class TableViz(BaseModel):
    type: Literal['table']
    data: TableData

# Add TableViz to VizSpecModel Union
VizSpecModel = Annotated[
    Union[FlowchartViz, ChartViz, NetworkViz, MermaidViz, TableViz],
    Field(discriminator='type')
]
```

### Phase 2: Prompt Engineering & Registry Update
Update `app/prompts/visualiser.py` with a new generator prompt that enforces the schema, and register it in `app/services/visualizer_registry.py`.
```python
# Example Prompt
TABLE_GENERATOR_PROMPT = """
You are an expert educational illustrator. Generate a table visualisation...
Schema:
  type: "table"
  data:
    headers: list of strings
    rows: list of lists of strings
...
"""

# Register it
VIZ_REGISTRY = {
    ...
    "table": {
        "description": "Comparison matrices or structured data across columns",
        "schema": TableViz,
        "system_prompt": TABLE_GENERATOR_PROMPT,
    },
}
```

### Phase 3: Frontend Component Implementation
Create a new React component to render the visualization and map it in the frontend renderer.
1. **Create Component:** Create `frontend/src/app/components/vizualizer/TableChart/index.tsx`.
2. **Update Types:** Ensure the frontend types (`frontend/src/app/components/vizualizer/types/`) are updated to include the new data structure.
3. **Map in Renderer:** Update `frontend/src/app/components/vizualizer/VizRenderer/index.tsx` to handle the new `type` in the switch statement.

```tsx
// Inside VizRenderer.tsx
switch (vizData.type) {
  // ... existing cases
  case 'table':
    return <TableChart data={vizData.data as TableData} />;
  default:
    return null;
}
```

---

## Prioritization Recommendation
For immediate impact, prioritize **CodeViz** and **MathViz**, as they directly address the core subjects typical for an AI tutor (Programming and STEM) where standard text and charts often fall short. Following that, **TableViz** provides the most general-purpose utility across all subjects.
