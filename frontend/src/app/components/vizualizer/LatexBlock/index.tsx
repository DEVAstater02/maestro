"use client"

import { motion } from 'framer-motion'
import { BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import { LatexData } from '../types/visualizer'

interface Props { data: LatexData }

export default function LatexBlock({ data }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            {data.context && (
                <p className="text-xs text-zinc-400 mb-4">{data.context}</p>
            )}
            <div className="flex flex-col gap-4">
                {data.blocks.map((block, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 text-center"
                    >
                        {block.label && (
                            <p className="text-xs text-indigo-400 font-semibold mb-2 uppercase tracking-wide">{block.label}</p>
                        )}
                        <div className="text-zinc-100 overflow-x-auto">
                            <BlockMath math={block.expression} />
                        </div>
                        {block.annotation && (
                            <p className="mt-2 text-xs text-zinc-400 italic">{block.annotation}</p>
                        )}
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}
