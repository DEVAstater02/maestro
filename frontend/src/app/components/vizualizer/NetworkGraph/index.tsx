"use client"

import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import { NetworkData } from '../types/visualizer'

interface NetworkGraphProps {
    data: NetworkData
    height?: number
    onNodeClick?: (id: string, label: string) => void
}

const GROUP_COLORS: Record<string, string> = {
    default: '#378ADD',
    input: '#1D9E75',
    output: '#D85A30',
    tool: '#BA7517',
    llm: '#7F77DD',
}

export default function NetworkGraph({
    data,
    height = 400,
    onNodeClick,
}: NetworkGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const cyRef = useRef<cytoscape.Core | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        cyRef.current?.destroy()

        cyRef.current = cytoscape({
            container: containerRef.current,
            elements: [
                ...data.nodes.map(n => ({
                    data: { id: n.id, label: n.label, group: n.group ?? 'default' }
                })),
                ...data.edges.map(e => ({
                    data: { id: e.id, source: e.source, target: e.target }
                })),
            ],
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'background-color': (ele) =>
                            GROUP_COLORS[ele.data('group')] ?? GROUP_COLORS.default,
                        'color': '#f0efe8',
                        'font-size': '12px',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': 100,
                        'height': 36,
                        'shape': 'roundrectangle',
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1.5,
                        'line-color': 'rgba(255,255,255,0.2)',
                        'target-arrow-color': 'rgba(255,255,255,0.2)',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                    }
                },
                {
                    selector: 'node:selected',
                    style: {
                        'border-width': 2,
                        'border-color': '#ffffff',
                    }
                }
            ],
            layout: { name: 'breadthfirst', directed: true, padding: 24 },
            userZoomingEnabled: true,
            userPanningEnabled: true,
        })

        if (onNodeClick) {
            cyRef.current.on('tap', 'node', (e) => {
                const node = e.target.data()
                onNodeClick(node.id, node.label)
            })
        }

        return () => { cyRef.current?.destroy() }
    }, [data])

    return <div ref={containerRef} style={{ width: '100%', height }} />
}