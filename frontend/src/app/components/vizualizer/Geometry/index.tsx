"use client"

import { motion } from 'framer-motion'
import { GeometryData, GeometryShape } from '../types/visualizer'

const DEFAULT_COLOR = '#4f46e5'
const AXIS_COLOR = '#3f3f46'
const VIEW = 400

interface Props { data: GeometryData }

function autoViewBox(shapes: GeometryShape[]): [number, number, number, number] {
    const xs: number[] = []
    const ys: number[] = []
    shapes.forEach(s => {
        for (let i = 0; i < s.coords.length; i += 2) {
            xs.push(s.coords[i])
            ys.push(s.coords[i + 1])
        }
        if (s.shape_type === 'circle') {
            xs.push(s.coords[0] + s.coords[2], s.coords[0] - s.coords[2])
            ys.push(s.coords[1] + s.coords[2], s.coords[1] - s.coords[2])
        }
    })
    if (!xs.length) return [-200, -200, 400, 400]
    const pad = 40
    const minX = Math.min(...xs) - pad
    const minY = Math.min(...ys) - pad
    const w = Math.max(...xs) - minX + pad
    const h = Math.max(...ys) - minY + pad
    return [minX, minY, w, h]
}

function renderShape(s: GeometryShape, i: number) {
    const color = s.color || DEFAULT_COLOR
    const stroke = color
    const fill = color + '22'
    const strokeDash = s.dashed ? '6,4' : undefined

    switch (s.shape_type) {
        case 'circle':
            return <circle key={i} cx={s.coords[0]} cy={s.coords[1]} r={s.coords[2]} fill={fill} stroke={stroke} strokeWidth={1.5} strokeDasharray={strokeDash} />
        case 'rect':
            return <rect key={i} x={s.coords[0]} y={s.coords[1]} width={s.coords[2]} height={s.coords[3]} fill={fill} stroke={stroke} strokeWidth={1.5} strokeDasharray={strokeDash} />
        case 'line':
            return <line key={i} x1={s.coords[0]} y1={s.coords[1]} x2={s.coords[2]} y2={s.coords[3]} stroke={stroke} strokeWidth={1.5} strokeDasharray={strokeDash} />
        case 'vector': {
            const [x1, y1, x2, y2] = s.coords
            const id = `arrow-${i}`
            return (
                <g key={i}>
                    <defs>
                        <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill={stroke} />
                        </marker>
                    </defs>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={1.5} markerEnd={`url(#${id})`} strokeDasharray={strokeDash} />
                </g>
            )
        }
        case 'polygon': {
            const pts = []
            for (let j = 0; j < s.coords.length; j += 2) pts.push(`${s.coords[j]},${s.coords[j + 1]}`)
            return <polygon key={i} points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.5} strokeDasharray={strokeDash} />
        }
        case 'point':
            return <circle key={i} cx={s.coords[0]} cy={s.coords[1]} r={4} fill={stroke} />
        default:
            return null
    }
}

function labelPos(s: GeometryShape): [number, number] {
    switch (s.shape_type) {
        case 'circle': return [s.coords[0], s.coords[1] - s.coords[2] - 6]
        case 'rect': return [s.coords[0] + s.coords[2] / 2, s.coords[1] - 6]
        case 'line':
        case 'vector': return [(s.coords[0] + s.coords[2]) / 2, (s.coords[1] + s.coords[3]) / 2 - 6]
        case 'point': return [s.coords[0] + 6, s.coords[1] - 6]
        case 'polygon': {
            let sx = 0, sy = 0, n = 0
            for (let j = 0; j < s.coords.length; j += 2) { sx += s.coords[j]; sy += s.coords[j + 1]; n++ }
            return [sx / n, sy / n - 6]
        }
        default: return [0, 0]
    }
}

export default function Geometry({ data }: Props) {
    const vb = data.viewbox ?? autoViewBox(data.shapes)
    const [vx, vy, vw, vh] = vb
    const showAxes = data.show_axes !== false

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4 flex justify-center"
        >
            <svg
                width={VIEW} height={VIEW}
                viewBox={`${vx} ${vy} ${vw} ${vh}`}
                className="max-w-full rounded-xl border border-zinc-700 bg-zinc-900"
            >
                {showAxes && (
                    <g>
                        <line x1={vx} y1={0} x2={vx + vw} y2={0} stroke={AXIS_COLOR} strokeWidth={1} />
                        <line x1={0} y1={vy} x2={0} y2={vy + vh} stroke={AXIS_COLOR} strokeWidth={1} />
                    </g>
                )}

                {data.shapes.map((s, i) => renderShape(s, i))}

                {data.shapes.map((s, i) => {
                    if (!s.label) return null
                    const [lx, ly] = labelPos(s)
                    return (
                        <text key={`lbl-${i}`} x={lx} y={ly} fontSize={11} fill="#e4e4e7" fontFamily="sans-serif" textAnchor="middle">
                            {s.label}
                        </text>
                    )
                })}
            </svg>
        </motion.div>
    )
}
