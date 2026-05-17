// --- node types for flowchart ---
export interface FlowNode {
    id: string
    label: string
    type?: 'input' | 'output' | 'llm' | 'tool' | 'default'
}

export interface FlowEdge {
    id: string
    source: string
    target: string
    label?: string
}

// --- chart ---
export interface ChartData {
    chartType: 'bar' | 'line' | 'pie'
    xKey: string
    yKey: string
    rows: Record<string, string | number>[]
}

// --- network ---
export interface NetworkData {
    nodes: { id: string; label: string; group?: string }[]
    edges: { id: string; source: string; target: string }[]
}

// --- timeline ---
export interface TimelineEvent {
    date: string
    title: string
    description: string
    category?: string
}

export interface TimelineData {
    events: TimelineEvent[]
    axis_label?: string
}

// --- tree ---
export interface TreeNode {
    id: string
    label: string
    note?: string
    children?: TreeNode[]
}

export interface TreeData {
    root: TreeNode
    direction: 'top-down' | 'left-right'
}

// --- stepper ---
export interface Step {
    number: number
    title: string
    description: string
    code_snippet?: string
    note?: string
}

export interface StepperData {
    steps: Step[]
    orientation: 'vertical' | 'horizontal'
}

// --- table ---
export interface TableData {
    headers: string[]
    rows: string[][]
    caption?: string
    highlight_col?: number
}

// --- mindmap ---
export interface MindMapNode {
    id: string
    label: string
    children?: MindMapNode[]
}

export interface MindMapData {
    central_topic: string
    branches: MindMapNode[]
}

// --- latex ---
export interface LatexBlock {
    expression: string
    label?: string
    annotation?: string
}

export interface LatexData {
    blocks: LatexBlock[]
    context?: string
}

// --- plotter ---
export interface PlotFunction {
    expression: string
    label: string
    color?: string
}

export interface PlotterData {
    functions: PlotFunction[]
    x_range: [number, number]
    y_range?: [number, number]
    x_label?: string
    y_label?: string
}

// --- analogy ---
export interface AnalogyPanel {
    concept: string
    metaphor: string
    points: string[]
}

export interface AnalogyData {
    left: AnalogyPanel
    right: AnalogyPanel
    connection_label: string
}

// --- code ---
export interface CodeData {
    language: string
    code: string
    highlight_lines?: number[]
    caption?: string
}

// --- quiz ---
export interface QuizOption {
    label: string
    text: string
}

export interface QuizData {
    question: string
    options: QuizOption[]
    correct_index: number
    explanation: string
}

// --- venn ---
export interface VennSet {
    label: string
    items: string[]
}

export interface VennData {
    sets: VennSet[]
    overlaps: string[][]
    caption?: string
}

// --- array_trace ---
export interface ArrayStep {
    label: string
    cells: string[]
    highlighted?: number[]
    pointers?: Record<string, number>
}

export interface ArrayTraceData {
    steps: ArrayStep[]
    caption?: string
}

// --- quadrant ---
export interface QuadrantItem {
    label: string
    x: number
    y: number
}

export interface QuadrantData {
    x_label: string
    y_label: string
    quadrant_labels: [string, string, string, string]
    items: QuadrantItem[]
}

// --- heatmap ---
export interface HeatmapData {
    row_labels: string[]
    col_labels: string[]
    values: number[][]
    scale_label?: string
}

// --- geometry ---
export interface GeometryShape {
    shape_type: 'circle' | 'rect' | 'line' | 'polygon' | 'vector' | 'point'
    label?: string
    coords: number[]
    color?: string
    dashed?: boolean
}

export interface GeometryData {
    shapes: GeometryShape[]
    show_axes?: boolean
    viewbox?: [number, number, number, number]
}

// --- stack_trace ---
export interface StackOperation {
    op: 'push' | 'pop' | 'peek' | 'enqueue' | 'dequeue' | 'none'
    value?: string
}

export interface StackStep {
    label: string
    stack: string[]
    operation: StackOperation
    highlighted?: number
}

export interface StackTraceData {
    steps: StackStep[]
    mode: 'stack' | 'queue'
    caption?: string
}

// --- truth_table ---
export interface TruthTableData {
    variables: string[]
    expressions: string[]
    rows: Record<string, boolean>[]
    highlight_col?: string
}

// --- number_line ---
export interface NumberLineMarker {
    value: number
    label: string
    color?: string
    filled?: boolean
}

export interface NumberLineRange {
    start: number
    end: number
    label?: string
    color?: string
    include_start?: boolean
    include_end?: boolean
}

export interface NumberLineData {
    min: number
    max: number
    markers?: NumberLineMarker[]
    ranges?: NumberLineRange[]
    tick_interval?: number
    label?: string
}

// --- the union type the LLM outputs ---
export type VizSpec =
    | { type: 'flowchart'; data: { nodes: FlowNode[]; edges: FlowEdge[] } }
    | { type: 'chart'; data: ChartData }
    | { type: 'network'; data: NetworkData }
    | { type: 'mermaid'; data: { syntax: string } }
    | { type: 'timeline'; data: TimelineData }
    | { type: 'tree'; data: TreeData }
    | { type: 'stepper'; data: StepperData }
    | { type: 'table'; data: TableData }
    | { type: 'mindmap'; data: MindMapData }
    | { type: 'latex'; data: LatexData }
    | { type: 'plotter'; data: PlotterData }
    | { type: 'analogy'; data: AnalogyData }
    | { type: 'code'; data: CodeData }
    | { type: 'quiz'; data: QuizData }
    | { type: 'venn'; data: VennData }
    | { type: 'array_trace'; data: ArrayTraceData }
    | { type: 'quadrant'; data: QuadrantData }
    | { type: 'heatmap'; data: HeatmapData }
    | { type: 'geometry'; data: GeometryData }
    | { type: 'stack_trace'; data: StackTraceData }
    | { type: 'truth_table'; data: TruthTableData }
    | { type: 'number_line'; data: NumberLineData }

// --- what the parser returns ---
export interface ParsedLLMResponse {
    text: string          // the markdown text with viz blocks removed
    viz: VizSpec | null   // the parsed viz spec, or null if none found
}