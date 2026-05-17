"use client"

import { motion } from 'framer-motion'
import { TruthTableData } from '../types/visualizer'

interface Props { data: TruthTableData }

function BoolCell({ value, highlighted }: { value: boolean; highlighted: boolean }) {
    return (
        <td className={`px-4 py-2 text-center font-mono text-sm font-bold border-b border-zinc-700/50
            ${highlighted
                ? value
                    ? 'text-emerald-300 bg-emerald-950/30'
                    : 'text-red-300 bg-red-950/20'
                : value
                    ? 'text-emerald-400'
                    : 'text-zinc-500'
            }`}
        >
            {value ? 'T' : 'F'}
        </td>
    )
}

export default function TruthTable({ data }: Props) {
    const allCols = [...data.variables, ...data.expressions]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4 overflow-x-auto"
        >
            <table className="mx-auto border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 border-zinc-600">
                        {data.variables.map(v => (
                            <th key={v} className="px-4 py-2 text-zinc-400 font-mono font-semibold text-center">
                                {v}
                            </th>
                        ))}
                        {/* divider column */}
                        <th className="px-1" />
                        {data.expressions.map(expr => (
                            <th
                                key={expr}
                                className={`px-4 py-2 font-mono font-semibold text-center
                                    ${expr === data.highlight_col
                                        ? 'text-indigo-300 border-b-2 border-indigo-500'
                                        : 'text-zinc-300'}`}
                            >
                                {expr}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                            {data.variables.map(v => (
                                <BoolCell key={v} value={row[v]} highlighted={false} />
                            ))}
                            <td className="px-1 border-b border-zinc-700/50 border-l border-zinc-600" />
                            {data.expressions.map(expr => (
                                <BoolCell
                                    key={expr}
                                    value={row[expr]}
                                    highlighted={expr === data.highlight_col}
                                />
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500">
                <span><span className="text-emerald-400 font-mono font-bold">T</span> = true</span>
                <span><span className="text-zinc-500 font-mono font-bold">F</span> = false</span>
                {data.highlight_col && (
                    <span className="text-indigo-400">↑ {data.highlight_col}</span>
                )}
            </div>
        </motion.div>
    )
}
