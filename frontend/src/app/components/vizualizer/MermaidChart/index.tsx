"use client"

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import PanZoomViewer from '../../PanZoomViewer'

interface MermaidChartProps {
    syntax: string
    diagramId: string
}

export default function MermaidChart({ syntax, diagramId }: MermaidChartProps) {
    const [svgHtml, setSvgHtml] = useState<string | null>(null)
    const [error, setError] = useState(false)
    const renderedKey = useRef<string | null>(null)

    useEffect(() => {
        if (renderedKey.current === diagramId) return
        renderedKey.current = diagramId
        setSvgHtml(null)
        setError(false)

        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            suppressErrorRendering: true,
            themeVariables: {
                primaryColor: '#292524',
                primaryTextColor: '#fafaf9',
                primaryBorderColor: '#57534e',
                lineColor: '#a8a29e',
                secondaryColor: '#44403c',
                tertiaryColor: '#1c1917',
            },
        })

        mermaid.render(`mermaid-${diagramId}`, syntax)
            .then(({ svg }) => setSvgHtml(svg))
            .catch(() => setError(true))
    }, [syntax, diagramId])

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
