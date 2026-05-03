"use client"

import { motion } from 'framer-motion'
import { HeatmapData } from '../types/visualizer'

interface Props { data: HeatmapData }

function interpolateColor(t: number): string {
    // 0 = dark zinc, 1 = indigo
    const r = Math.round(24 + t * (99 - 24))
    const g = Math.round(24 + t * (102 - 24))
    const b = Math.round(27 + t * (241 - 27))
    return `rgb(${r},${g},${b})`
}

export default function Heatmap({ data }: Props) {
    const flat = data.values.flat()
    const min = Math.min(...flat)
    const max = Math.max(...flat)
    const range = max - min || 1

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4 overflow-x-auto"
        >
            <table className="mx-auto border-collapse text-xs">
                <thead>
                    <tr>
                        <th className="w-20" />
                        {data.col_labels.map((col, i) => (
                            <th key={i} className="px-2 py-1 text-zinc-400 font-medium text-center min-w-[48px]">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.values.map((row, ri) => (
                        <tr key={ri}>
                            <td className="pr-3 py-1 text-zinc-400 text-right font-medium whitespace-nowrap">{data.row_labels[ri]}</td>
                            {row.map((val, ci) => {
                                const t = (val - min) / range
                                return (
                                    <td
                                        key={ci}
                                        title={String(val)}
                                        className="text-center font-mono font-semibold rounded"
                                        style={{
                                            backgroundColor: interpolateColor(t),
                                            color: t > 0.5 ? '#fff' : '#a1a1aa',
                                            padding: '6px 8px',
                                            margin: 2,
                                        }}
                                    >
                                        {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(2)) : val}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.scale_label && (
                <p className="mt-2 text-xs text-zinc-500 text-center">{data.scale_label}</p>
            )}
        </motion.div>
    )
}
