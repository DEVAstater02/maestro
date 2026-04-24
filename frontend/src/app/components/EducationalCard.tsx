"use client";

import { motion } from "framer-motion";
import VizRenderer from "./vizualizer/VizRenderer";
import { VizSpec } from "./vizualizer/types/visualizer";

export interface StructuredVis {
  title: string;
  viz?: VizSpec;
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
  const hasViz = !!data.viz;
  const hasExplanation = data.explanation?.code;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-full overflow-auto p-6 sm:p-10 pb-40 scrollbar-thin"
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {!hasViz && (
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-text)]">
            {data.title}
          </h2>
        )}

        {hasViz && (
          <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg)] p-4">
            <VizRenderer spec={data.viz!} id={cardId} />
          </div>
        )}

        {hasExplanation && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              {data.explanation!.heading}
            </p>
            <pre className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-5 text-[13px] leading-[1.7] font-mono text-[var(--color-text)] overflow-x-auto whitespace-pre">
              {data.explanation!.code}
            </pre>
            {data.explanation!.result && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
                <pre className="text-[13px] font-mono font-medium text-[var(--color-text)] whitespace-pre">
                  {data.explanation!.result}
                </pre>
              </div>
            )}
          </div>
        )}

        {data.keyPoints && data.keyPoints.length > 0 && (
          <div
            className={`grid gap-3 ${data.keyPoints.length === 1
                ? "grid-cols-1"
                : data.keyPoints.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
              }`}
          >
            {data.keyPoints.map((kp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3 }}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                  {kp.title}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {kp.text}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {data.examples && data.examples.length > 0 && (
          <div className="space-y-2">
            {data.examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                {ex.label && (
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                    {ex.label}
                  </p>
                )}
                <div className="flex gap-4 text-[12px] font-mono">
                  <div className="flex-1">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide block mb-1">
                      Input
                    </span>
                    <pre className="bg-[var(--color-surface-alt)] rounded p-2 whitespace-pre-wrap text-[var(--color-text)]">
                      {ex.input}
                    </pre>
                  </div>
                  <div className="flex items-center text-[var(--color-text-muted)]">&rarr;</div>
                  <div className="flex-1">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide block mb-1">
                      Output
                    </span>
                    <pre className="bg-[var(--color-surface-alt)] rounded p-2 whitespace-pre-wrap text-[var(--color-text)]">
                      {ex.output}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data.footnote && (
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
            {data.footnote}
          </p>
        )}
      </div>
    </motion.div>
  );
}
