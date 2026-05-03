"use client"

import { motion } from 'framer-motion'
import { MindMapData, MindMapNode } from '../types/visualizer'

const BRANCH_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const CX = 200
const CY = 200
const R1 = 110  // branch radius
const R2 = 175  // child radius
const CENTER_R = 52

interface BranchPos {
    node: MindMapNode
    x: number
    y: number
    angle: number
    color: string
    children: { node: MindMapNode; x: number; y: number }[]
}

function computePositions(data: MindMapData): BranchPos[] {
    const n = data.branches.length
    return data.branches.map((branch, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        const bx = CX + R1 * Math.cos(angle)
        const by = CY + R1 * Math.sin(angle)
        const color = BRANCH_COLORS[i % BRANCH_COLORS.length]
        const kids = (branch.children || []).slice(0, 3)
        const spread = Math.PI / 6
        const children = kids.map((child, j) => {
            const offset = kids.length === 1 ? 0 : (j - (kids.length - 1) / 2) * spread
            const ca = angle + offset
            return {
                node: child,
                x: CX + R2 * Math.cos(ca),
                y: CY + R2 * Math.sin(ca),
            }
        })
        return { node: branch, x: bx, y: by, angle, color, children }
    })
}

interface Props { data: MindMapData }

export default function MindMap({ data }: Props) {
    const positions = computePositions(data)
    const svgSize = 400

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4 flex justify-center"
        >
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="max-w-full">
                {positions.map((b, i) => (
                    <g key={i}>
                        {/* center → branch edge */}
                        <line x1={CX} y1={CY} x2={b.x} y2={b.y} stroke={b.color} strokeWidth={2} strokeOpacity={0.6} />
                        {/* branch → children edges */}
                        {b.children.map((c, j) => (
                            <line key={j} x1={b.x} y1={b.y} x2={c.x} y2={c.y} stroke={b.color} strokeWidth={1.2} strokeOpacity={0.4} />
                        ))}
                    </g>
                ))}

                {/* center node */}
                <circle cx={CX} cy={CY} r={CENTER_R} fill="#1e1b4b" stroke="#4f46e5" strokeWidth={2} />
                <foreignObject x={CX - CENTER_R + 4} y={CY - 18} width={(CENTER_R - 4) * 2} height={36}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ fontSize: 10, color: '#c7d2fe', textAlign: 'center', fontFamily: 'sans-serif', fontWeight: 600, lineHeight: 1.2 }}>
                            {data.central_topic}
                        </span>
                    </div>
                </foreignObject>

                {positions.map((b, i) => (
                    <g key={i}>
                        {/* branch node */}
                        <ellipse cx={b.x} cy={b.y} rx={44} ry={18} fill="#27272a" stroke={b.color} strokeWidth={1.5} />
                        <text x={b.x} y={b.y + 4} textAnchor="middle" fontSize={10} fill="#e4e4e7" fontFamily="sans-serif" fontWeight={600}>
                            {b.node.label.length > 14 ? b.node.label.slice(0, 13) + '…' : b.node.label}
                        </text>

                        {/* child nodes */}
                        {b.children.map((c, j) => (
                            <g key={j}>
                                <ellipse cx={c.x} cy={c.y} rx={36} ry={14} fill="#1c1c1e" stroke={b.color} strokeWidth={1} strokeOpacity={0.6} />
                                <text x={c.x} y={c.y + 4} textAnchor="middle" fontSize={9} fill="#a1a1aa" fontFamily="sans-serif">
                                    {c.node.label.length > 11 ? c.node.label.slice(0, 10) + '…' : c.node.label}
                                </text>
                            </g>
                        ))}
                    </g>
                ))}
            </svg>
        </motion.div>
    )
}
