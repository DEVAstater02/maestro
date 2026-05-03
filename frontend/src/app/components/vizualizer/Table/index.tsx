"use client"

import { motion } from 'framer-motion'
import { TableData } from '../types/visualizer'

interface Props { data: TableData }

export default function Table({ data }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            <div className="overflow-x-auto rounded-xl border border-zinc-700">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-zinc-800">
                            {data.headers.map((h, i) => (
                                <th
                                    key={i}
                                    className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider
                                        ${i === (data.highlight_col ?? 0) ? 'text-indigo-400' : 'text-zinc-400'}`}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? 'bg-zinc-900/60' : 'bg-zinc-800/30'}>
                                {row.map((cell, ci) => (
                                    <td
                                        key={ci}
                                        className={`px-4 py-2.5 text-xs
                                            ${ci === (data.highlight_col ?? 0)
                                                ? 'text-zinc-100 font-medium'
                                                : 'text-zinc-300'}`}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.caption && (
                <p className="mt-2 text-xs text-zinc-500 text-center">{data.caption}</p>
            )}
        </motion.div>
    )
}
