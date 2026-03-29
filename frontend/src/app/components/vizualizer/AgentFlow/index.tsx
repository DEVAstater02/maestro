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

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState(animated ? [] : allRFNodes)
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(animated ? [] : allRFEdges)

    const onConnect = useCallback(
        (params: Connection) => setRfEdges((eds: Edge[]) => addEdge(params, eds)),
        [setRfEdges]
    )

    useEffect(() => {
        if (!animated) return

        const laidOutMap = Object.fromEntries(allRFNodes.map(n => [n.id, n]))

        const sequence: Array<
            | { kind: 'node'; item: FlowNode }
            | { kind: 'edge'; item: FlowEdge }
        > = []

        nodes.forEach(node => {
            sequence.push({ kind: 'node', item: node })
            edges
                .filter(e => e.source === node.id)
                .forEach(edge => sequence.push({ kind: 'edge', item: edge }))
        })

        const timeouts: ReturnType<typeof setTimeout>[] = []

        sequence.forEach((step, i) => {
            const t = setTimeout(() => {
                if (step.kind === 'node') {
                    setRfNodes((prev: Node[]) => [...prev, laidOutMap[step.item.id]])
                } else {
                    setRfEdges((prev: Edge[]) => [...prev, toRFEdge(step.item)])
                }
            }, i * stepDelay)
            timeouts.push(t)
        })

        return () => timeouts.forEach(clearTimeout)
    }, [nodes, edges, animated, stepDelay])

    return (
        <div style={{ width: '100%', height, background: 'var(--color-bg)' }}>
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