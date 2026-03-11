"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import PanZoomViewer from "./PanZoomViewer";

/* ─── Types ─── */
export interface StructuredVis {
  title: string;
  diagram?: string;
  explanation?: {
    heading: string;
    code: string;
    result?: string;
  };
  keyPoints?: { title: string; text: string }[];
  examples?: { label?: string; input: string; output: string }[];
  footnote?: string;
}

interface EducationalCardProps {
  data: StructuredVis;
  cardId: string;
}

export default function EducationalCard({ data, cardId }: EducationalCardProps) {
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [diagramError, setDiagramError] = useState(false);
  const renderAttempted = useRef(false);

  /* ─── Render Mermaid diagram ─── */
  useEffect(() => {
    if (!data.diagram || renderAttempted.current) return;
    renderAttempted.current = true;

    (async () => {
      try {
        const id = `edu-mermaid-${cardId}`;
        const { svg } = await mermaid.render(id, data.diagram!);
        setDiagramSvg(svg);
      } catch {
        setDiagramError(true);
      }
    })();
  }, [data.diagram, cardId]);

  // Reset when cardId changes
  useEffect(() => {
    renderAttempted.current = false;
    setDiagramSvg(null);
    setDiagramError(false);
  }, [cardId]);

  const hasExplanation = data.explanation?.code;
  const hasDiagram = data.diagram;
  const twoColumn = hasDiagram && hasExplanation;

  return (
    <div className="w-full h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto">

        {/* ─── Title ─── */}
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-center">
          {data.title}
        </h2>

        {/* ─── Main Content: Diagram + Explanation ─── */}
        <div className={`${twoColumn ? "grid grid-cols-2 gap-px bg-[var(--color-border)]" : ""} rounded-xl border border-[var(--color-border)] overflow-hidden mb-4`}>

          {/* Left: Diagram */}
          {hasDiagram && (
            <div className="bg-[var(--color-bg)] min-h-[280px] relative">
              {diagramError ? (
                <div className="w-full h-full flex items-center justify-center p-6">
                  <p className="text-xs text-[var(--color-text-muted)]">Diagram could not render</p>
                </div>
              ) : diagramSvg ? (
                <PanZoomViewer svgHtml={diagramSvg} diagramId={cardId} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-[var(--color-border)] border-t-[var(--color-text)] rounded-full animate-spin" />
                </div>
              )}
              {/* Column label */}
              <span className="absolute top-3 left-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">
                Structure
              </span>
            </div>
          )}

          {/* Right: Explanation / Code */}
          {hasExplanation && (
            <div className="bg-[var(--color-bg)] p-5 relative">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">
                {data.explanation!.heading}
              </span>

              {/* Code block */}
              <pre className="mt-3 bg-[var(--color-surface-alt)] border border-[var(--color-border-subtle)] rounded-lg p-4 text-[12px] leading-[1.7] font-mono text-[var(--color-text)] overflow-x-auto whitespace-pre">
                {data.explanation!.code}
              </pre>

              {/* Result highlight */}
              {data.explanation!.result && (
                <div className="mt-3 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg p-3">
                  <pre className="text-[12px] font-mono font-semibold text-[var(--color-text)] whitespace-pre">
                    {data.explanation!.result}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Single-column fallback: only diagram, no explanation */}
          {hasDiagram && !hasExplanation && null}

          {/* Single-column fallback: only explanation, no diagram */}
          {!hasDiagram && hasExplanation && null}
        </div>

        {/* ─── Key Points ─── */}
        {data.keyPoints && data.keyPoints.length > 0 && (
          <div className={`grid gap-3 mb-4 ${data.keyPoints.length === 1 ? "grid-cols-1" : data.keyPoints.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {data.keyPoints.map((kp, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text)] mb-1">
                  {kp.title}
                </p>
                <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                  {kp.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ─── Examples ─── */}
        {data.examples && data.examples.length > 0 && (
          <div className="space-y-2 mb-4">
            {data.examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
              >
                {ex.label && (
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                    {ex.label}
                  </p>
                )}
                <div className="flex gap-4 text-[12px] font-mono">
                  <div className="flex-1">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide block mb-1">Input</span>
                    <pre className="bg-[var(--color-surface-alt)] rounded p-2 whitespace-pre-wrap">{ex.input}</pre>
                  </div>
                  <div className="flex items-center text-[var(--color-text-muted)]">→</div>
                  <div className="flex-1">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide block mb-1">Output</span>
                    <pre className="bg-[var(--color-surface-alt)] rounded p-2 whitespace-pre-wrap">{ex.output}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Footnote ─── */}
        {data.footnote && (
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed text-center">
            {data.footnote}
          </p>
        )}

      </div>
    </div>
  );
}
