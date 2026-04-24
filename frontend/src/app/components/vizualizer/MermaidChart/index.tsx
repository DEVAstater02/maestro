"use client"

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useTheme } from 'next-themes'
import PanZoomViewer from '../../PanZoomViewer'

interface MermaidChartProps {
    syntax: string
    diagramId: string
}

export default function MermaidChart({ syntax, diagramId }: MermaidChartProps) {
    const { resolvedTheme } = useTheme()
    const [svgHtml, setSvgHtml] = useState<string | null>(null)
    const [error, setError] = useState(false)
    const renderedKey = useRef<string | null>(null)

    useEffect(() => {
        const key = `${diagramId}-${resolvedTheme}`
        if (renderedKey.current === key) return
        renderedKey.current = key
        setSvgHtml(null)
        setError(false)

        const isDark = resolvedTheme === 'dark'
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'loose',
            suppressErrorRendering: true,
            themeVariables: isDark
                ? {
                    primaryColor: '#1e293b',
                    primaryTextColor: '#e2e8f0',
                    primaryBorderColor: '#475569',
                    lineColor: '#94a3b8',
                    secondaryColor: '#141414',
                    tertiaryColor: '#1a1a1a',
                }
                : {
                    primaryColor: '#e0f2fe',
                    primaryTextColor: '#0f172a',
                    primaryBorderColor: '#94a3b8',
                    lineColor: '#64748b',
                    secondaryColor: '#f0fdf4',
                    tertiaryColor: '#f8fafc',
                    noteBkgColor: '#fefce8',
                    noteTextColor: '#1e293b',
                },
        })

        mermaid.render(`mermaid-${diagramId}`, syntax)
            .then(({ svg }) => setSvgHtml(svg))
            .catch(() => setError(true))
    }, [syntax, diagramId, resolvedTheme])

    if (error) {
        return (
            <div className="w-full h-[500px] flex flex-col items-center justify-center bg-[var(--color-surface-alt)]">
                <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                    Rendering Error
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)] text-center max-w-[220px]">
                    The diagram syntax is invalid.
                </p>
            </div>
        )
    }

    if (!svgHtml) {
        return (
            <div className="w-full h-[500px] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-text)] rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="w-full min-h-[500px] relative">
            <PanZoomViewer svgHtml={svgHtml} diagramId={diagramId} />
        </div>
    )
}
