"use client";

import { CheckCircle2, Circle, Trophy } from "lucide-react";

interface ContentNode {
  title: string;
  concept?: string;
}

interface SyllabusPanelProps {
  nodes: ContentNode[];
  currentIndex: number;
  isCompleted: boolean;
  syllabusTitle?: string;
}

export default function SyllabusPanel({
  nodes,
  currentIndex,
  isCompleted,
  syllabusTitle,
}: SyllabusPanelProps) {
  return (
    <div className="h-full border-r border-[var(--color-border-subtle)] bg-[var(--color-surface)]/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/80 backdrop-blur-md shrink-0">
        <h3 className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">
          Syllabus
        </h3>
        {syllabusTitle && (
          <p className="text-[12px] font-medium text-[var(--color-text)] mt-0.5 truncate">
            {syllabusTitle}
          </p>
        )}
      </div>

      {/* Completion banner */}
      {isCompleted && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 shrink-0">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            Course Complete
          </span>
        </div>
      )}

      {/* Node list */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin">
        {nodes.length === 0 && (
          <p className="text-[12px] text-center text-[var(--color-text-muted)] mt-8 tracking-wide">
            No syllabus loaded
          </p>
        )}

        {nodes.map((node, i) => {
          const isDone = isCompleted || i < currentIndex;
          const isCurrent = !isCompleted && i === currentIndex;

          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                isCurrent
                  ? "bg-amber-500/10 border border-amber-500/20"
                  : "border border-transparent"
              } ${!isCurrent && !isDone ? "opacity-40" : ""}`}
            >
              {/* Status icon */}
              <div className="shrink-0 mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                ) : isCurrent ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-400/20" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-[var(--color-border)]" />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0">
                <p
                  className={`text-[12px] font-medium leading-snug ${
                    isCurrent || isDone
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {node.title}
                </p>
                {isCurrent && node.concept && (
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug line-clamp-3">
                    {node.concept}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
