# Visualizer System — Design & Implementation Plan

## Goal

Build a scalable, visually consistent visualization layer for Maestro that can serve **any subject domain** — not just CS. Every visualization type is a custom React component (no Mermaid), so the visual language is fully controlled and matches the application aesthetic.

---

## Agent Architecture: Two-Shot

The current one-shot design (pick type + generate content in one call) does not scale past ~8–10 types. Classification quality degrades as the union schema grows.

### New Design

```
User message + Tutor response
        │
        ▼
┌─────────────────────────────┐
│  Shot 1 — Classifier        │  Fast/cheap model (Haiku)
│  Input:  exchange text      │  ~300ms
│  Output: { viz_type, why }  │
└─────────────────────────────┘
        │
        ▼  (viz_type lookup → schema injected)
┌─────────────────────────────┐
│  Shot 2 — Generator         │  Full model (Sonnet)
│  Input:  type-specific      │  ~1–2s
│          schema + exchange  │
│  Output: typed JSON         │
└─────────────────────────────┘
        │
        ▼
  React component renders
```

**Why this fits the latency budget:** Visualization runs in parallel with TTS. TTS for a 3–4 sentence response takes ~4–8s. Two sequential LLM calls (~1.8s total) complete well within that window.

**Why this scales:** Adding a new type = one line in the classifier list + one schema in the registry. No existing prompt is touched.

---

## Visualization Type Registry

### Structural / Relational

| Type | Visual | Topics |
|---|---|---|
| `tree` | Top-down node tree, rounded nodes, clean edge routing | Binary trees, taxonomy, parse trees, org charts, inheritance hierarchies |
| `network` | Force-directed graph | Concept maps, neural net diagrams, social graphs |
| `flowchart` | Directed graph with typed node shapes (input/process/decision/output) | Algorithms, pipelines, decision trees |
| `mindmap` | Radial tree from a central concept node | Topic overviews, brainstorming, concept intro |
| `venn` | 2–3 overlapping circles, labeled regions | Set theory, concept overlap, literary theme comparison |

### Temporal / Sequential

| Type | Visual | Topics |
|---|---|---|
| `timeline` | Horizontal scrollable track with dated event cards | History, biography, evolution, product releases, causality chains |
| `stepper` | Numbered vertical/horizontal step cards | Algorithms, procedures, cooking, engineering design process |
| `array_trace` | Row of cells, step-by-step highlighting, variable labels beneath | Sorting, pointer movement, DP table population |

### Quantitative / Data

| Type | Visual | Topics |
|---|---|---|
| `chart` | Bar / line / pie / scatter | Statistics, trends, comparisons, distributions |
| `heatmap` | Grid of cells colored by intensity value | Confusion matrices, correlation tables, frequency analysis |
| `plotter` | Cartesian plane with f(x) curve(s) | Algebra, calculus, physics (motion, waves, fields) |
| `table` | Styled N-column comparison table | Vocabulary, feature comparison, element properties |

### Math / Science

| Type | Visual | Topics |
|---|---|---|
| `latex` | KaTeX-rendered equation block with optional label and annotation | Any STEM equation — physics, chemistry, statistics, geometry |
| `geometry` | SVG canvas: labeled shapes, angles, vectors, coordinate axes | Geometry theorems, physics vectors, trigonometry |
| `annotated` | SVG/image base with pin callouts at (x, y) coordinates | Anatomy, circuits, architectural diagrams, geographic regions |

### Conceptual / Pedagogical

| Type | Visual | Topics |
|---|---|---|
| `analogy` | Two-panel card — concept A ↔ concept B with connecting label | Any abstract concept grounded in a concrete metaphor |
| `quadrant` | 2×2 labeled grid with items placed in cells | Trade-offs, Eisenhower matrix, political compass, risk matrix |
| `flashcard` | Front/back flip card | Vocabulary, formulas, definitions, recall practice |

---

## Build Priority

### Phase 1 — Core (covers ~85% of topics)
- `timeline`
- `tree`
- `stepper`
- `table`
- `mindmap`
- `latex`
- `plotter`
- `analogy`

### Phase 2 — High Value, Moderate Effort
- `venn`
- `heatmap`
- `array_trace`
- `quadrant`
- `geometry`

### Phase 3 — Specialized (build when a topic demands it)
- `annotated` (needs coordinate system + SVG asset pipeline)
- `flashcard` (needs flip animation + recall tracking)

---

## Implementation Architecture

### Backend

#### Type Registry (`app/services/visualizer_registry.py`)
```python
VIZ_REGISTRY = {
    "timeline":    { "description": "...", "schema": TimelineViz },
    "tree":        { "description": "...", "schema": TreeViz },
    "stepper":     { "description": "...", "schema": StepperViz },
    # ...
}
```
Each entry holds a one-line description (for the classifier prompt) and the Pydantic schema (for the generator prompt).

#### Shot 1 — Classifier Prompt
The classifier receives only:
- The tutoring exchange (user message + tutor response)
- A flat list of `type_name: one-line description` pairs

Output schema:
```python
class ClassifierOutput(BaseModel):
    viz_type: Optional[str]  # None means no visualization needed
    reasoning: str
```

#### Shot 2 — Generator Prompt
Built dynamically:
```python
schema = VIZ_REGISTRY[viz_type]["schema"]
system_prompt = build_generator_prompt(viz_type, schema)
result = await llm.generate_structured_response(prompt, schema, system_prompt)
```

Only the selected type's schema is in the prompt. No other types exist as far as the generator is concerned.

#### Pydantic Models (`app/models/user_models.py`)
One model class per viz type. Each is independently versioned and tested.

### Frontend

#### VizRenderer (`frontend/src/app/components/vizualizer/VizRenderer/index.tsx`)
Extended switch statement — one `case` per type, maps to its component.

#### Component Structure
```
vizualizer/
  types/visualizer.tsx       ← union type + per-type interfaces
  VizRenderer/index.tsx      ← dispatcher
  Timeline/index.tsx
  Tree/index.tsx
  Stepper/index.tsx
  Table/index.tsx
  MindMap/index.tsx
  LatexBlock/index.tsx
  Plotter/index.tsx
  Analogy/index.tsx
  Venn/index.tsx
  Heatmap/index.tsx
  ArrayTrace/index.tsx
  Quadrant/index.tsx
  Geometry/index.tsx
  # existing:
  DataChart/index.tsx
  NetworkGraph/index.tsx
  AgentFlow/index.tsx        ← likely merges into flowchart
```

#### Visual Language (apply consistently across all components)
- Same border radius, shadow, and background token
- Same font family and size scale
- Same color palette for node types, categories, highlights
- Smooth entrance animation (`framer-motion` or CSS) — all cards slide in from bottom
- Dark-mode aware from the start

---

## Data Flow (updated)

```
User audio
    → STT
    → LLM (tutor response) ──────────────────────────────────┐
    → TTS streaming to client                                  │ parallel
                                                               ▼
                                              Shot 1: Classifier (Haiku)
                                                               │
                                              Shot 2: Generator (Sonnet)
                                                               │
                                              sanitize / validate
                                                               │
                                              WS → { type: "visualisation",
                                                     format: "structured",
                                                     data: { ... } }
```

---

## Classifier Prompt (draft)

```
You are a visualization classifier for an AI tutoring system.

Given a tutoring exchange, decide which single visualization type 
would best help the student understand the concept being taught.
If no visualization would meaningfully add to understanding, return null.

Available types:
- timeline: ordered events or milestones over time
- tree: hierarchical parent-child structure (binary tree, taxonomy, org chart)
- stepper: sequential numbered steps in a process
- table: side-by-side comparison of items across properties
- mindmap: radial concept map around a central topic
- latex: mathematical or scientific equation
- plotter: graph of a mathematical function f(x)
- analogy: two-panel comparison linking abstract concept to familiar metaphor
- venn: overlapping regions showing shared and distinct properties
- heatmap: grid of values colored by intensity
- array_trace: step-by-step state of an array or list during an algorithm
- quadrant: 2x2 grid for categorizing items across two axes
- geometry: labeled geometric shapes, vectors, or coordinate constructions
- chart: bar, line, pie, or scatter chart for quantitative data
- network: nodes and edges showing relationships between concepts
- flowchart: directed graph for algorithms, decisions, or pipelines

Return JSON: { "viz_type": "<type> or null", "reasoning": "<one sentence>" }
```

---

## Open Questions / Decisions Needed

1. **`flowchart` vs `AgentFlow`** — current `AgentFlow` is CS-specific (has `llm`/`tool` node types). Generalize it into a plain `flowchart` type or keep both?
2. **`plotter` library** — `function-plot` (lightweight) vs embedding Desmos (feature-rich but heavier)? User interaction (zoom/pan) needed?
3. **`annotated` asset source** — who provides the base SVG/image? LLM describes coordinates but can't generate images. Needs a curated asset library or a procedural SVG generator.
4. **Classifier model** — use Haiku for cost/speed or same model as tutor for consistency?
5. **Fallback** — if Shot 2 fails validation, do we retry, fall back to `null`, or fall back to a simpler type?
