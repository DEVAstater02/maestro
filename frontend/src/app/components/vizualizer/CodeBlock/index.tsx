"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CodeData } from '../types/visualizer'

interface Props { data: CodeData }

export default function CodeBlock({ data }: Props) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(data.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    const highlightedLines: Record<number, React.CSSProperties> = {}
    if (data.highlight_lines) {
        data.highlight_lines.forEach(line => {
            highlightedLines[line] = {
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                display: 'block',
                borderLeft: '2px solid #4f46e5',
                marginLeft: '-1rem',
                paddingLeft: 'calc(1rem - 2px)',
            }
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4"
        >
            <div className="relative rounded-xl overflow-hidden border border-zinc-700">
                {/* header bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                    <span className="text-xs text-zinc-400 font-mono">{data.language}</span>
                    <button
                        onClick={handleCopy}
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                <SyntaxHighlighter
                    language={data.language}
                    style={vscDarkPlus}
                    showLineNumbers
                    wrapLines
                    lineProps={lineNum => ({
                        style: highlightedLines[lineNum] || { display: 'block' }
                    })}
                    customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: '0.75rem',
                        background: '#0f0f10',
                    }}
                >
                    {data.code}
                </SyntaxHighlighter>
            </div>
            {data.caption && (
                <p className="mt-2 text-xs text-zinc-500 text-center">{data.caption}</p>
            )}
        </motion.div>
    )
}
