"use client"

import { useCallback } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Edge,
    BackgroundVariant,
} from '@xyflow/react'
import { FlowNode, FlowEdge } from '../types/visualizer'

interface AgentFlowProps {
    nodes: FlowNode[]
    edges: FlowEdge[]
    height?: number
}

const NODE_COLORS: Record<string, string> = {
    input: '#1D9E75',
    output: '#D85A30',
    llm: '#7F77DD',
    tool: '#BA7517',
    default: '#378ADD',
}

// converts your FlowNode shape into ReactFlow's expected shape
function toRFNodes(nodes: FlowNode[]): Node[] {
    return nodes.map((n, i) => ({
        id: n.id,
        position: { x: 200 * (i % 3), y: 120 * Math.floor(i / 3) },
        data: { label: n.label },
        type: 'default',
        style: {
            background: NODE_COLORS[n.type ?? 'default'],
            color: '#f0efe8',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            padding: '8px 16px',
            minWidth: 100,
        },
    }))
}

function toRFEdges(edges: FlowEdge[]): Edge[] {
    return edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        style: { stroke: 'rgba(255,255,255,0.25)' },
        labelStyle: { fontSize: 11, fill: '#aaa' },
    }))
}

export default function AgentFlow({ nodes, edges, height = 400 }: AgentFlowProps) {
    const [rfNodes, setRfNodes, onNodesChange] = useNodesState(toRFNodes(nodes))
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(toRFEdges(edges))

    const onConnect = useCallback(
        (params: Connection) => setRfEdges((eds: Edge[]) => addEdge(params, eds)),
        [setRfEdges]
    )

    return (
        <div style={{ width: '100%', height }}>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                fitViewOptions={{ padding: 0.2 }}
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(255,255,255,0.05)" />
                <Controls />
            </ReactFlow>
        </div>
    )
}