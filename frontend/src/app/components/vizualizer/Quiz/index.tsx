"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QuizData } from '../types/visualizer'

interface Props { data: QuizData }

export default function Quiz({ data }: Props) {
    const [selected, setSelected] = useState<number | null>(null)
    const answered = selected !== null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            <p className="text-sm font-semibold text-zinc-100 mb-4">{data.question}</p>

            <div className="flex flex-col gap-2">
                {data.options.map((opt, i) => {
                    const isCorrect = i === data.correct_index
                    const isSelected = i === selected

                    let borderColor = 'border-zinc-700 hover:border-zinc-500'
                    let bgColor = 'bg-zinc-800/50'
                    let labelColor = 'text-zinc-400'

                    if (answered) {
                        if (isCorrect) {
                            borderColor = 'border-emerald-500'
                            bgColor = 'bg-emerald-950/40'
                            labelColor = 'text-emerald-400'
                        } else if (isSelected) {
                            borderColor = 'border-red-500'
                            bgColor = 'bg-red-950/40'
                            labelColor = 'text-red-400'
                        }
                    }

                    return (
                        <button
                            key={i}
                            disabled={answered}
                            onClick={() => setSelected(i)}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${borderColor} ${bgColor}`}
                        >
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${labelColor} border-current`}>
                                {opt.label}
                            </span>
                            <span className="text-sm text-zinc-200">{opt.text}</span>
                        </button>
                    )
                })}
            </div>

            <AnimatePresence>
                {answered && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700"
                    >
                        <p className="text-xs font-semibold text-indigo-400 mb-1">Explanation</p>
                        <p className="text-xs text-zinc-300">{data.explanation}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
