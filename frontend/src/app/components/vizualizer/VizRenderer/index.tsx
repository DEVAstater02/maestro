"use client"

import { VizSpec } from '../types/visualizer'
import DataChart from '../DataChart/index'
import NetworkGraph from '../NetworkGraph'
import AgentFlow from '../AgentFlow'
import MermaidChart from '../MermaidChart'

interface VizRendererProps {
    spec: VizSpec
}

export default function VizRenderer({ spec }: VizRendererProps) {
    switch (spec.type) {
        case 'chart':
            return (
                <DataChart
                    data={spec.data}
                    height={300}
                />
            )

        case 'flowchart':
            return <AgentFlow nodes={spec.data.nodes} edges={spec.data.edges} />

        case 'network':
            return (
                <NetworkGraph
                    data={spec.data}
                    height={300}
                />
            )

        case 'mermaid':
            return <MermaidChart syntax={spec.data.syntax} />

        default:
            return null
    }
}