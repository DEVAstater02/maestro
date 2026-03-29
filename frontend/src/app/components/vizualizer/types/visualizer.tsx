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

// --- the union type the LLM outputs ---
export type VizSpec =
    | { type: 'flowchart'; data: { nodes: FlowNode[]; edges: FlowEdge[] } }
    | { type: 'chart'; data: ChartData }
    | { type: 'network'; data: NetworkData }
    | { type: 'mermaid'; data: { syntax: string } }

// --- what the parser returns ---
export interface ParsedLLMResponse {
    text: string          // the markdown text with viz blocks removed
    viz: VizSpec | null   // the parsed viz spec, or null if none found
}