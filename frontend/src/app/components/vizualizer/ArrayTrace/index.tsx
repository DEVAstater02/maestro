"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrayTraceData } from '../types/visualizer'

interface Props { data: ArrayTraceData }

export default function ArrayTrace({ data }: Props) {
    const [step, setStep] = useState(0)
    const current = data.steps[step]
    const total = data.steps.length

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            {/* Array cells */}
            <div className="flex justify-center gap-1 mb-3 flex-wrap">
                {current.cells.map((cell, i) => {
                    const isHighlighted = current.highlighted?.includes(i)
                    return (
                        <motion.div
                            key={i}
                            layout
                            className={`relative flex items-center justify-center w-10 h-10 rounded-lg border font-mono text-sm font-bold transition-all
                                ${isHighlighted
                                    ? 'border-indigo-400 bg-indigo-900/60 text-indigo-200'
                                    : 'border-zinc-600 bg-zinc-800 text-zinc-300'}`}
                        >
                            {cell}
                            {/* pointer label */}
                            {current.pointers && Object.entries(current.pointers).map(([name, idx]) =>
                                idx === i ? (
                                    <span key={name} className="absolute -bottom-5 text-[9px] text-amber-400 font-mono">{name}</span>
                                ) : null
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* index labels */}
            <div className="flex justify-center gap-1 mb-5 flex-wrap">
                {current.cells.map((_, i) => (
                    <div key={i} className="w-10 text-center text-[9px] text-zinc-600 font-mono">{i}</div>
                ))}
            </div>

            {/* step label */}
            <AnimatePresence mode="wait">
                <motion.p
                    key={step}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-zinc-400 text-center mb-4 min-h-[1.25rem]"
                >
                    {current.label}
                </motion.p>
            </AnimatePresence>

            {/* controls */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={() => setStep(s => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="px-3 py-1.5 text-xs rounded-lg border border-zinc-600 text-zinc-300 disabled:opacity-30 hover:border-zinc-400 transition-all"
                >
                    ← Prev
                </button>
                <span className="text-xs text-zinc-500">{step + 1} / {total}</span>
                <button
                    onClick={() => setStep(s => Math.min(total - 1, s + 1))}
                    disabled={step === total - 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-zinc-600 text-zinc-300 disabled:opacity-30 hover:border-zinc-400 transition-all"
                >
                    Next →
                </button>
            </div>

            {data.caption && <p className="mt-3 text-xs text-zinc-500 text-center">{data.caption}</p>}
        </motion.div>
    )
}
