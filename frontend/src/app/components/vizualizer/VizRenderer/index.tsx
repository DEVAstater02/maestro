"use client"

import { VizSpec } from '../types/visualizer'
import DataChart from '../DataChart/index'
import NetworkGraph from '../NetworkGraph'
import AgentFlow from '../AgentFlow'
import MermaidChart from '../MermaidChart'

interface VizRendererProps {
    spec: VizSpec
    id: string
}

export default function VizRenderer({ spec, id }: VizRendererProps) {
    if (!spec || !spec.data) return null;

    switch (spec.type) {
        case 'chart':
            return <DataChart data={spec.data} height={750} />

        case 'flowchart':
            return <AgentFlow nodes={spec.data.nodes} edges={spec.data.edges} height={750} />

        case 'network':
            return <NetworkGraph data={spec.data} height={750} />

        case 'mermaid':
            return <MermaidChart syntax={spec.data.syntax} diagramId={id} />

        default:
            return null
    }
}
