"use client"

import { motion } from 'framer-motion'
import { TimelineData } from '../types/visualizer'

const CATEGORY_COLORS = [
    '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
]

interface Props {
    data: TimelineData
}

export default function Timeline({ data }: Props) {
    const categories = [...new Set(data.events.map(e => e.category).filter(Boolean))]
    const colorMap: Record<string, string> = {}
    categories.forEach((c, i) => { if (c) colorMap[c] = CATEGORY_COLORS[i % CATEGORY_COLORS.length] })

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            {data.axis_label && (
                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-4">{data.axis_label}</p>
            )}
            <div className="relative">
                {/* vertical spine */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-700" />

                <div className="flex flex-col gap-6 pl-12">
                    {data.events.map((event, i) => {
                        const color = event.category ? colorMap[event.category] : CATEGORY_COLORS[0]
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="relative"
                            >
                                {/* dot */}
                                <div
                                    className="absolute -left-[2.05rem] top-1.5 w-3 h-3 rounded-full border-2 border-zinc-900"
                                    style={{ backgroundColor: color }}
                                />
                                <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono" style={{ color }}>{event.date}</span>
                                        {event.category && (
                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300">{event.category}</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-100">{event.title}</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">{event.description}</p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </motion.div>
    )
}
