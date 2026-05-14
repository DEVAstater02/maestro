"use client"

import { motion } from 'framer-motion'
import { TreeData, TreeNode } from '../types/visualizer'

interface NodePos {
    node: TreeNode
    x: number
    y: number
    children: NodePos[]
}

const NODE_W = 120
const NODE_H = 36
const H_GAP = 20
const V_GAP = 60

function computeLayout(node: TreeNode, depth = 0): NodePos {
    const children = (node.children || []).map(c => computeLayout(c, depth + 1))
    let x = 0
    if (children.length === 0) {
        x = 0
    } else {
        let offset = 0
        children.forEach(c => {
            c.x += offset
            c.children.forEach(function shiftAll(n: NodePos) {
                n.x += offset
                n.children.forEach(shiftAll)
            })
            offset += subtreeWidth(c) + H_GAP
        })
        const first = children[0].x
        const last = children[children.length - 1].x
        x = (first + last) / 2
    }
    return { node, x, y: depth * (NODE_H + V_GAP), children }
}

function subtreeWidth(pos: NodePos): number {
    if (pos.children.length === 0) return NODE_W
    return pos.children.reduce((sum, c) => sum + subtreeWidth(c) + H_GAP, 0) - H_GAP
}

function collectAll(pos: NodePos): NodePos[] {
    return [pos, ...pos.children.flatMap(collectAll)]
}

function collectEdges(pos: NodePos): { x1: number; y1: number; x2: number; y2: number }[] {
    return pos.children.flatMap(c => [
        { x1: pos.x + NODE_W / 2, y1: pos.y + NODE_H, x2: c.x + NODE_W / 2, y2: c.y },
        ...collectEdges(c)
    ])
}

interface Props { data: TreeData }

export default function Tree({ data }: Props) {
    const layout = computeLayout(data.root)
    const all = collectAll(layout)
    const edges = collectEdges(layout)

    const minX = Math.min(...all.map(n => n.x))
    const maxX = Math.max(...all.map(n => n.x + NODE_W))
    const maxY = Math.max(...all.map(n => n.y + NODE_H))
    const pad = 16
    const svgW = maxX - minX + pad * 2
    const svgH = maxY + pad * 2
    const ox = pad - minX

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full overflow-x-auto p-4"
        >
            <svg width={svgW} height={svgH} className="mx-auto">
                {edges.map((e, i) => (
                    <line
                        key={i}
                        x1={e.x1 + ox} y1={e.y1 + pad}
                        x2={e.x2 + ox} y2={e.y2 + pad}
                        stroke="#52525b" strokeWidth={1.5}
                    />
                ))}
                {all.map((n, i) => (
                    <g key={i}>
                        <rect
                            x={n.x + ox} y={n.y + pad}
                            width={NODE_W} height={NODE_H}
                            rx={8} ry={8}
                            fill="#27272a" stroke="#4f46e5" strokeWidth={1.5}
                        />
                        <text
                            x={n.x + ox + NODE_W / 2} y={n.y + pad + NODE_H / 2 + 4}
                            textAnchor="middle"
                            fontSize={11} fill="#e4e4e7" fontFamily="sans-serif"
                        >
                            {n.node.label}
                        </text>
                    </g>
                ))}
            </svg>
        </motion.div>
    )
}
