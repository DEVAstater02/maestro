"use client"

import { motion } from 'framer-motion'
import { AnalogyData } from '../types/visualizer'

interface Props { data: AnalogyData }

export default function Analogy({ data }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            <div className="flex items-stretch gap-3">
                {/* Left panel — abstract concept */}
                <div className="flex-1 bg-indigo-950/40 border border-indigo-800 rounded-xl p-4">
                    <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold mb-1">Concept</p>
                    <p className="text-sm font-bold text-zinc-100 mb-0.5">{data.left.concept}</p>
                    <p className="text-xs text-zinc-400 mb-3 italic">{data.left.metaphor}</p>
                    <ul className="flex flex-col gap-1.5">
                        {data.left.points.map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-300">
                                <span className="text-indigo-400 mt-0.5">•</span>
                                {p}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Center connector */}
                <div className="flex flex-col items-center justify-center gap-1 min-w-[56px]">
                    <div className="h-full w-px bg-zinc-700" />
                    <div className="bg-zinc-800 border border-zinc-600 rounded-full px-2 py-1 text-center">
                        <span className="text-[10px] text-zinc-400 whitespace-nowrap">{data.connection_label}</span>
                    </div>
                    <div className="h-full w-px bg-zinc-700" />
                </div>

                {/* Right panel — familiar metaphor */}
                <div className="flex-1 bg-emerald-950/30 border border-emerald-800 rounded-xl p-4">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold mb-1">Real World</p>
                    <p className="text-sm font-bold text-zinc-100 mb-0.5">{data.right.concept}</p>
                    <p className="text-xs text-zinc-400 mb-3 italic">{data.right.metaphor}</p>
                    <ul className="flex flex-col gap-1.5">
                        {data.right.points.map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-300">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                {p}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    )
}
