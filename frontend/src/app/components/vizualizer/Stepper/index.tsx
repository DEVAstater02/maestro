"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { StepperData } from '../types/visualizer'

interface Props { data: StepperData }

export default function Stepper({ data }: Props) {
    const [active, setActive] = useState(0)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            <div className={`flex ${data.orientation === 'horizontal' ? 'flex-row gap-3 overflow-x-auto' : 'flex-col gap-3'}`}>
                {data.steps.map((step, i) => {
                    const isActive = i === active
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            onClick={() => setActive(i)}
                            className={`relative flex gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                ${isActive
                                    ? 'border-indigo-500 bg-indigo-950/40'
                                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'}`}
                        >
                            {/* connector line */}
                            {i < data.steps.length - 1 && data.orientation === 'vertical' && (
                                <div className="absolute left-[1.6rem] top-[3rem] bottom-[-0.75rem] w-px bg-zinc-700 z-0" />
                            )}

                            {/* step number */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10
                                ${isActive ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                {step.number}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${isActive ? 'text-indigo-300' : 'text-zinc-200'}`}>
                                    {step.title}
                                </p>
                                {isActive && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-1"
                                    >
                                        <p className="text-xs text-zinc-400">{step.description}</p>
                                        {step.code_snippet && (
                                            <pre className="mt-2 text-xs bg-zinc-900 rounded-lg p-2 overflow-x-auto text-emerald-300 font-mono">
                                                {step.code_snippet}
                                            </pre>
                                        )}
                                        {step.note && (
                                            <p className="mt-1 text-xs text-amber-400 italic">{step.note}</p>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    )
}
