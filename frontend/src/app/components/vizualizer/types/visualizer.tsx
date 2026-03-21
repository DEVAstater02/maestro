// AgentFlow types
export interface AgentNode {
    id: string
    label: string
    status: 'idle' | 'running' | 'done' | 'error'
    type?: 'llm' | 'tool' | 'router' | 'input' | 'output'
}

export interface AgentEdge {
    id: string
    source: string
    target: string
    label?: string
}

export interface AgentFlowData {
    nodes: AgentNode[]
    edges: AgentEdge[]
}

// DataChart types
export interface ChartDataPoint {
    label: string
    value: number
    [key: string]: string | number
}

// // NetworkGraph types
// export interface NetworkNode {
//   id: string
//   label: string
//   group?: string
// }

// export interface NetworkEdge {
//   id: string
//   source: string
//   target: string
//   weight?: number
// }