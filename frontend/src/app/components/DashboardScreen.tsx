"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface SyllabusInfo {
  id: string;
  title: string;
  created_at: string;
  content_json?: any;
}

interface DashboardScreenProps {
  userName: string;
  authToken: string;
  onSignOut: () => void;
  onStartNew: () => void;
  onResumeSyllabus: (syllabus: any) => void;
}

export default function DashboardScreen({
  userName,
  authToken,
  onSignOut,
  onStartNew,
  onResumeSyllabus,
}: DashboardScreenProps) {
  const [syllabuses, setSyllabuses] = useState<SyllabusInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/syllabus/list", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setSyllabuses(data.syllabuses || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authToken]);

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      {/* ── Header ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 h-14 border-b border-[var(--color-border)] bg-[var(--color-bg)] z-10">
        <span className="text-base font-semibold tracking-tight">maestro</span>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="text-xs text-[var(--color-text-muted)]">
              Hi, <span className="font-medium text-[var(--color-text)]">{userName}</span>
            </span>
          )}
          <ThemeToggle />
          <button
            onClick={onSignOut}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border)] rounded-full px-3 py-1"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto pt-24 px-6 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Your Notebooks</h1>
              <p className="text-[var(--color-text-muted)]">Resume where you left off or start a new learning journey.</p>
            </div>
            <button
              onClick={onStartNew}
              className="px-5 py-2.5 bg-[var(--color-text)] text-[var(--color-bg)] text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
            >
              Start New Learning
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="w-8 h-8 border-2 border-[var(--color-text)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-[var(--color-danger)]">{error}</div>
          ) : syllabuses.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface-alt)]">
              <h2 className="text-lg font-medium mb-2">No notebooks yet</h2>
              <p className="text-[var(--color-text-muted)] max-w-sm mx-auto">
                You haven't created any learning materials yet. Click the button above to generate your first syllabus.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {syllabuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onResumeSyllabus(s.content_json)}
                  className="flex flex-col text-left p-5 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] hover:border-[var(--color-text)] hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center group-hover:bg-[var(--color-text)] group-hover:text-[var(--color-bg)] transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg line-clamp-1 mb-1">{s.title || "Untitled Notebook"}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-auto">
                    {new Date(s.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
