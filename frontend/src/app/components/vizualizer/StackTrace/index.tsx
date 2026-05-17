"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StackTraceData } from '../types/visualizer'

interface Props { data: StackTraceData }

const OP_COLOR: Record<string, string> = {
    push: 'text-emerald-400',
    enqueue: 'text-emerald-400',
    pop: 'text-red-400',
    dequeue: 'text-red-400',
    peek: 'text-amber-400',
    none: 'text-zinc-500',
}

export default function StackTrace({ data }: Props) {
    const [step, setStep] = useState(0)
    const current = data.steps[step]
    const total = data.steps.length
    const isStack = data.mode === 'stack'

    // stack renders top-to-bottom (last element = top = first row)
    // queue renders left-to-right (first element = front)
    const displayItems = isStack ? [...current.stack].reverse() : current.stack

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            {/* mode label */}
            <div className="text-center mb-4">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                    {isStack ? 'Stack (LIFO)' : 'Queue (FIFO)'}
                </span>
            </div>

            {isStack ? (
                /* vertical stack */
                <div className="flex flex-col items-center gap-1 mb-4 min-h-[160px] justify-end">
                    <div className="text-[9px] text-zinc-600 font-mono mb-1">← top</div>
                    <AnimatePresence mode="popLayout">
                        {displayItems.map((item, i) => {
                            const originalIdx = current.stack.length - 1 - i
                            const isHighlighted = originalIdx === current.highlighted
                            return (
                                <motion.div
                                    key={`${step}-${i}`}
                                    layout
                                    initial={{ opacity: 0, scaleY: 0.5 }}
                                    animate={{ opacity: 1, scaleY: 1 }}
                                    exit={{ opacity: 0, scaleY: 0.5 }}
                                    transition={{ duration: 0.2 }}
                                    className={`w-32 h-10 flex items-center justify-center rounded-lg border font-mono text-sm font-bold transition-all
                                        ${isHighlighted
                                            ? 'border-indigo-400 bg-indigo-900/60 text-indigo-200'
                                            : 'border-zinc-600 bg-zinc-800 text-zinc-300'}`}
                                >
                                    {item}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                    {displayItems.length === 0 && (
                        <div className="w-32 h-10 flex items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-600 text-xs">
                            empty
                        </div>
                    )}
                    <div className="w-32 border-t-2 border-zinc-600 mt-1" />
                    <div className="text-[9px] text-zinc-600 font-mono">base</div>
                </div>
            ) : (
                /* horizontal queue */
                <div className="flex items-center justify-center gap-1 mb-4 flex-wrap min-h-[60px]">
                    <div className="text-[9px] text-zinc-600 font-mono mr-1">front →</div>
                    <AnimatePresence mode="popLayout">
                        {displayItems.map((item, i) => {
                            const isHighlighted = i === current.highlighted
                            return (
                                <motion.div
                                    key={`${step}-${i}`}
                                    layout
                                    initial={{ opacity: 0, scaleX: 0.5 }}
                                    animate={{ opacity: 1, scaleX: 1 }}
                                    exit={{ opacity: 0, scaleX: 0.5 }}
                                    transition={{ duration: 0.2 }}
                                    className={`w-12 h-12 flex items-center justify-center rounded-lg border font-mono text-sm font-bold transition-all
                                        ${isHighlighted
                                            ? 'border-indigo-400 bg-indigo-900/60 text-indigo-200'
                                            : 'border-zinc-600 bg-zinc-800 text-zinc-300'}`}
                                >
                                    {item}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                    {displayItems.length === 0 && (
                        <div className="w-24 h-12 flex items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-600 text-xs">
                            empty
                        </div>
                    )}
                    <div className="text-[9px] text-zinc-600 font-mono ml-1">← rear</div>
                </div>
            )}

            {/* operation badge */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center mb-4"
                >
                    <span className={`font-mono text-sm font-bold ${OP_COLOR[current.operation.op]}`}>
                        {current.label}
                    </span>
                </motion.div>
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
