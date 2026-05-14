"use client"

import { motion } from 'framer-motion'
import { QuadrantData } from '../types/visualizer'

const SIZE = 320
const PAD = 40
const INNER = SIZE - PAD * 2

interface Props { data: QuadrantData }

export default function Quadrant({ data }: Props) {
    const [topLeft, topRight, bottomLeft, bottomRight] = data.quadrant_labels

    // map -1..1 to SVG coords
    const toSvgX = (x: number) => PAD + ((x + 1) / 2) * INNER
    const toSvgY = (y: number) => PAD + ((1 - y) / 2) * INNER  // flip y

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4 flex flex-col items-center"
        >
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full">
                {/* Quadrant backgrounds */}
                <rect x={PAD} y={PAD} width={INNER / 2} height={INNER / 2} fill="#1e1b4b" fillOpacity={0.4} />
                <rect x={PAD + INNER / 2} y={PAD} width={INNER / 2} height={INNER / 2} fill="#052e16" fillOpacity={0.4} />
                <rect x={PAD} y={PAD + INNER / 2} width={INNER / 2} height={INNER / 2} fill="#1c1917" fillOpacity={0.4} />
                <rect x={PAD + INNER / 2} y={PAD + INNER / 2} width={INNER / 2} height={INNER / 2} fill="#1c1f2e" fillOpacity={0.4} />

                {/* Axes */}
                <line x1={PAD} y1={SIZE / 2} x2={SIZE - PAD} y2={SIZE / 2} stroke="#52525b" strokeWidth={1.5} />
                <line x1={SIZE / 2} y1={PAD} x2={SIZE / 2} y2={SIZE - PAD} stroke="#52525b" strokeWidth={1.5} />

                {/* Quadrant labels */}
                <text x={PAD + 6} y={PAD + 14} fontSize={9} fill="#6366f1" fontFamily="sans-serif">{topLeft}</text>
                <text x={SIZE - PAD - 6} y={PAD + 14} fontSize={9} fill="#10b981" fontFamily="sans-serif" textAnchor="end">{topRight}</text>
                <text x={PAD + 6} y={SIZE - PAD - 6} fontSize={9} fill="#78716c" fontFamily="sans-serif">{bottomLeft}</text>
                <text x={SIZE - PAD - 6} y={SIZE - PAD - 6} fontSize={9} fill="#6b7280" fontFamily="sans-serif" textAnchor="end">{bottomRight}</text>

                {/* Axis labels */}
                <text x={SIZE / 2} y={SIZE - 6} fontSize={10} fill="#a1a1aa" fontFamily="sans-serif" textAnchor="middle">{data.x_label}</text>
                <text x={10} y={SIZE / 2} fontSize={10} fill="#a1a1aa" fontFamily="sans-serif" textAnchor="middle" transform={`rotate(-90, 10, ${SIZE / 2})`}>{data.y_label}</text>

                {/* Items */}
                {data.items.map((item, i) => {
                    const cx = toSvgX(item.x)
                    const cy = toSvgY(item.y)
                    return (
                        <g key={i}>
                            <circle cx={cx} cy={cy} r={4} fill="#4f46e5" />
                            <text x={cx + 6} y={cy + 4} fontSize={9} fill="#e4e4e7" fontFamily="sans-serif">{item.label}</text>
                        </g>
                    )
                })}
            </svg>
        </motion.div>
    )
}
