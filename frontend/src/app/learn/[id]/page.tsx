"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LearningScreen from "../../components/LearningScreen";

export default function LearnPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [syllabusTitle, setSyllabusTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("maestro_token");
    if (!token) {
      router.replace("/");
      return;
    }

    fetch(`http://localhost:8000/api/syllabus/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Syllabus not found");
        return res.json();
      })
      .then((data) => {
        setSyllabusTitle(data.title || "Untitled");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-text)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--color-text-muted)]">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center space-y-4">
          <p className="text-[var(--color-text-muted)]">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="text-sm font-medium underline text-[var(--color-text)]"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <LearningScreen
      syllabusId={id}
      syllabusTitle={syllabusTitle}
      onHome={() => router.push("/")}
    />
  );
}
