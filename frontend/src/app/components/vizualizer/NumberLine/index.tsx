"use client"

import { motion } from 'framer-motion'
import { NumberLineData } from '../types/visualizer'

interface Props { data: NumberLineData }

const DEFAULT_RANGE_COLOR = '#4f46e5'
const DEFAULT_MARKER_COLOR = '#a78bfa'

export default function NumberLine({ data }: Props) {
    const { min, max, markers = [], ranges = [], label } = data
    const span = max - min

    // auto tick interval
    const tickInterval = data.tick_interval ?? (() => {
        const raw = span / 8
        const mag = Math.pow(10, Math.floor(Math.log10(raw)))
        const norm = raw / mag
        const nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10
        return nice * mag
    })()

    // generate tick values
    const firstTick = Math.ceil(min / tickInterval) * tickInterval
    const ticks: number[] = []
    for (let v = firstTick; v <= max + 1e-9; v = Math.round((v + tickInterval) * 1e9) / 1e9) {
        ticks.push(v)
    }

    // coordinate helper: value → % along line (5%–95% range with padding)
    const PAD = 0.07
    const toX = (v: number) => `${(PAD + ((v - min) / span) * (1 - 2 * PAD)) * 100}%`

    const svgH = 80

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            <svg
                viewBox={`0 0 400 ${svgH}`}
                className="w-full"
                style={{ height: svgH * 2 }}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* shaded ranges */}
                {ranges.map((r, i) => {
                    const x1 = PAD + ((r.start - min) / span) * (1 - 2 * PAD)
                    const x2 = PAD + ((r.end - min) / span) * (1 - 2 * PAD)
                    const color = r.color ?? DEFAULT_RANGE_COLOR
                    return (
                        <g key={i}>
                            <rect
                                x={`${x1 * 100}%`}
                                y="32"
                                width={`${(x2 - x1) * 100}%`}
                                height="16"
                                fill={color}
                                fillOpacity={0.25}
                            />
                            {/* start bracket */}
                            <circle
                                cx={`${x1 * 100}%`} cy="40" r="4"
                                fill={r.include_start !== false ? color : 'transparent'}
                                stroke={color} strokeWidth="1.5"
                            />
                            {/* end bracket */}
                            <circle
                                cx={`${x2 * 100}%`} cy="40" r="4"
                                fill={r.include_end !== false ? color : 'transparent'}
                                stroke={color} strokeWidth="1.5"
                            />
                            {r.label && (
                                <text
                                    x={`${((x1 + x2) / 2) * 100}%`}
                                    y="28"
                                    textAnchor="middle"
                                    fontSize="8"
                                    fill={color}
                                >
                                    {r.label}
                                </text>
                            )}
                        </g>
                    )
                })}

                {/* axis line */}
                <line x1={toX(min)} y1="40" x2={toX(max)} y2="40" stroke="#52525b" strokeWidth="2" />

                {/* ticks */}
                {ticks.map(v => (
                    <g key={v}>
                        <line x1={toX(v)} y1="36" x2={toX(v)} y2="44" stroke="#71717a" strokeWidth="1" />
                        <text
                            x={toX(v)} y="54"
                            textAnchor="middle"
                            fontSize="8"
                            fill="#71717a"
                        >
                            {Number.isInteger(v) ? v : v.toFixed(1)}
                        </text>
                    </g>
                ))}

                {/* axis label */}
                {label && (
                    <text x={toX(max)} y="40" dx="10" dy="4" fontSize="10" fill="#a1a1aa" fontStyle="italic">
                        {label}
                    </text>
                )}

                {/* markers */}
                {markers.map((m, i) => {
                    const color = m.color ?? DEFAULT_MARKER_COLOR
                    const filled = m.filled !== false
                    return (
                        <g key={i}>
                            <circle
                                cx={toX(m.value)} cy="40" r="5"
                                fill={filled ? color : 'transparent'}
                                stroke={color} strokeWidth="1.5"
                            />
                            <text
                                x={toX(m.value)} y="22"
                                textAnchor="middle"
                                fontSize="8"
                                fill={color}
                            >
                                {m.label}
                            </text>
                            <line
                                x1={toX(m.value)} y1="24"
                                x2={toX(m.value)} y2="34"
                                stroke={color} strokeWidth="1" strokeDasharray="2,2"
                            />
                        </g>
                    )
                })}
            </svg>
        </motion.div>
    )
}
