"use client"

import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

interface MermaidChartProps {
    syntax: string
}

export default function MermaidChart({ syntax }: MermaidChartProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!ref.current) return
        mermaid.initialize({ startOnLoad: false, theme: 'dark' })
        mermaid.render('mermaid-svg', syntax).then(({ svg }) => {
            if (ref.current) ref.current.innerHTML = svg
        })
    }, [syntax])

    return <div ref={ref} />
}