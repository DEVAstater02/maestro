"use client"

import { useCallback, useEffect } from 'react'
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
    NodeTypes,
    Handle,
    Position,
} from '@xyflow/react'
import { FlowNode, FlowEdge } from '../types/visualizer'
import dagre from '@dagrejs/dagre'

interface AgentFlowProps {
    nodes: FlowNode[]
    edges: FlowEdge[]
    height?: number
    animated?: boolean
    stepDelay?: number
}

const NODE_COLORS: Record<string, string> = {
    input: '#1D9E75',
    output: '#D85A30',
    llm: '#7F77DD',
    tool: '#BA7517',
    default: '#378ADD',
}

// custom node — handles long labels without clipping
function FlowNodeComponent({ data }: { data: Record<string, unknown> }) {
    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: 'rgba(255,255,255,0.3)', border: 'none' }}
            />
            <div style={{
                background: data.color as string,
                color: '#f0efe8',
                borderRadius: 8,
                fontSize: 12,
                padding: '8px 14px',
                minWidth: 100,
                maxWidth: 220,
                textAlign: 'center',
                lineHeight: '1.5',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
            }}>
                {data.label as string}
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ background: 'rgba(255,255,255,0.3)', border: 'none' }}
            />
        </>
    )
}

const nodeTypes: NodeTypes = {
    flowNode: FlowNodeComponent,
}

function toRFNode(n: FlowNode): Node {
    return {
        id: n.id,
        position: { x: 0, y: 0 }, // dagre overrides this
        type: 'flowNode',
        data: {
            label: n.label,
            color: NODE_COLORS[n.type ?? 'default'],
        },
    }
}

function toRFEdge(e: FlowEdge): Edge {
    return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        style: { stroke: 'rgba(255,255,255,0.25)' },
        labelStyle: { fontSize: 11, fill: '#aaa' },
    }
}

function getLayoutedNodes(nodes: Node[], edges: Edge[]): Node[] {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 90 })

    nodes.forEach(n => g.setNode(n.id, { width: 220, height: 44 }))
    edges.forEach(e => g.setEdge(e.source, e.target))

    dagre.layout(g)

    return nodes.map(n => {
        const { x, y } = g.node(n.id)
        return { ...n, position: { x: x - 110, y: y - 22 } }
    })
}

export default function AgentFlow({
    nodes,
    edges,
    height = 400,
    animated = true,
    stepDelay = 400,
}: AgentFlowProps) {
    const allRFEdges = edges.map(toRFEdge)
    const allRFNodes = getLayoutedNodes(nodes.map(toRFNode), allRFEdges)

    const initialNodes = animated 
        ? allRFNodes.map(n => ({ ...n, style: { ...n.style, opacity: 0, transition: 'opacity 0.4s ease' } }))
        : allRFNodes;
        
    const initialEdges = animated
        ? allRFEdges.map(e => ({ ...e, style: { ...e.style, opacity: 0, transition: 'opacity 0.4s ease' } }))
        : allRFEdges;

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes)
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges)

    const onConnect = useCallback(
        (params: Connection) => setRfEdges((eds: Edge[]) => addEdge(params, eds)),
        [setRfEdges]
    )

    useEffect(() => {
        if (!animated) return

        const sequence: Array<
            | { kind: 'node'; id: string }
            | { kind: 'edge'; id: string }
        > = []

        nodes.forEach(node => {
            sequence.push({ kind: 'node', id: node.id })
            edges
                .filter(e => e.source === node.id)
                .forEach(edge => sequence.push({ kind: 'edge', id: edge.id }))
        })

        const timeouts: ReturnType<typeof setTimeout>[] = []

        sequence.forEach((step, i) => {
            const t = setTimeout(() => {
                if (step.kind === 'node') {
                    setRfNodes((nds: Node[]) => nds.map(n => n.id === step.id ? { ...n, style: { ...n.style, opacity: 1 } } : n))
                } else {
                    setRfEdges((eds: Edge[]) => eds.map(e => e.id === step.id ? { ...e, style: { ...e.style, opacity: 1 } } : e))
                }
            }, i * stepDelay)
            timeouts.push(t)
        })

        return () => timeouts.forEach(clearTimeout)
    }, [nodes, edges, animated, stepDelay, setRfNodes, setRfEdges])

    return (
        <div style={{ width: '100%', height, background: 'var(--color-bg)' }}>
            <style>{`
                .react-flow__controls button {
                    background-color: var(--color-surface-alt, #1e293b) !important;
                    border-bottom: 1px solid var(--color-border, #334155) !important;
                    fill: var(--color-text, #f8fafc) !important;
                }
                .react-flow__controls button:hover {
                    background-color: var(--color-border, #475569) !important;
                }
                .react-flow__attribution {
                    display: none !important;
                }
            `}</style>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                fitViewOptions={{ padding: 0.25 }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="rgba(255,255,255,0.04)"
                />
                <Controls />
            </ReactFlow>
        </div>
    )
}