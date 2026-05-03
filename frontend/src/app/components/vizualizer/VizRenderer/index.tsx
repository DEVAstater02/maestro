"use client"

import { VizSpec } from '../types/visualizer'
import DataChart from '../DataChart/index'
import NetworkGraph from '../NetworkGraph'
import AgentFlow from '../AgentFlow'
import MermaidChart from '../MermaidChart'
import Timeline from '../Timeline'
import Tree from '../Tree'
import Stepper from '../Stepper'
import Table from '../Table'
import MindMap from '../MindMap'
import LatexBlock from '../LatexBlock'
import Plotter from '../Plotter'
import Analogy from '../Analogy'
import CodeBlock from '../CodeBlock'
import Quiz from '../Quiz'
import Venn from '../Venn'
import ArrayTrace from '../ArrayTrace'
import Quadrant from '../Quadrant'
import Heatmap from '../Heatmap'
import Geometry from '../Geometry'

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

        case 'timeline':
            return <Timeline data={spec.data} />

        case 'tree':
            return <Tree data={spec.data} />

        case 'stepper':
            return <Stepper data={spec.data} />

        case 'table':
            return <Table data={spec.data} />

        case 'mindmap':
            return <MindMap data={spec.data} />

        case 'latex':
            return <LatexBlock data={spec.data} />

        case 'plotter':
            return <Plotter data={spec.data} />

        case 'analogy':
            return <Analogy data={spec.data} />

        case 'code':
            return <CodeBlock data={spec.data} />

        case 'quiz':
            return <Quiz data={spec.data} />

        case 'venn':
            return <Venn data={spec.data} />

        case 'array_trace':
            return <ArrayTrace data={spec.data} />

        case 'quadrant':
            return <Quadrant data={spec.data} />

        case 'heatmap':
            return <Heatmap data={spec.data} />

        case 'geometry':
            return <Geometry data={spec.data} />

        default:
            return null
    }
}
