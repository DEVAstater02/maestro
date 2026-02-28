"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import mermaid from "mermaid";
import EducationalCard, { type StructuredVis } from "./components/EducationalCard";

/* ─── Types ─── */
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
type AppState = "idle" | "recording" | "sending" | "processing" | "receiving" | "speaking";

interface CardEntry {
  id: string;
  label: string;
  format: "structured" | "mermaid";
  data: StructuredVis;        // structured JSON from Claude
  thumbnailSvg?: string;      // rendered SVG for thumbnail preview
  failed?: boolean;
}

/* ─── Icons ─── */
const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
    <line x1="12" y1="22" x2="12" y2="19" />
  </svg>
);

const StopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function Home() {
  const [status, setStatus] = useState("Ready to connect");
  const [appState, setAppState] = useState<AppState>("idle");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  /* ─── Card history ─── */
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const lastTranscriptionRef = useRef("");
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const responseAudioChunksRef = useRef<ArrayBuffer[]>([]);
  const isReceivingAudioRef = useRef(false);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Mermaid init ─── */
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
  }, []);

  const truncateLabel = (text: string, max = 32) =>
    text.length > max ? text.slice(0, max) + "…" : text;

  /* ─── Render a thumbnail SVG for a Mermaid code string ─── */
  const renderThumbnailSvg = useCallback(async (mermaidCode: string): Promise<string> => {
    try {
      const id = `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const { svg } = await mermaid.render(id, mermaidCode);
      return svg;
    } catch {
      return "";
    }
  }, []);

  /* ─── Handle incoming visualisation ─── */
  const handleVisualisation = useCallback(async (msg: { type: string; format?: string; data: unknown }) => {
    const label = truncateLabel(lastTranscriptionRef.current || "Diagram");

    if (msg.format === "structured" && typeof msg.data === "object" && msg.data !== null) {
      // Structured JSON from Claude
      const visData = msg.data as StructuredVis;
      let thumbSvg = "";
      if (visData.diagram) {
        thumbSvg = await renderThumbnailSvg(visData.diagram);
      }

      const entry: CardEntry = {
        id: `card-${Date.now()}`,
        label: visData.title || label,
        format: "structured",
        data: visData,
        thumbnailSvg: thumbSvg,
      };

      setCards((prev) => {
        const next = [...prev, entry];
        setActiveIndex(next.length - 1);
        return next;
      });
    } else if (typeof msg.data === "string") {
      // Raw Mermaid fallback
      const mermaidCode = msg.data;
      let thumbSvg = "";
      let failed = false;

      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        thumbSvg = svg;
      } catch {
        failed = true;
      }

      // Wrap raw Mermaid into a StructuredVis with just a diagram
      const entry: CardEntry = {
        id: `mermaid-${Date.now()}`,
        label,
        format: "mermaid",
        data: { title: label, diagram: mermaidCode },
        thumbnailSvg: thumbSvg,
        failed,
      };

      setCards((prev) => {
        const next = [...prev, entry];
        setActiveIndex(next.length - 1);
        return next;
      });
    }
  }, [renderThumbnailSvg]);

  /* Auto-scroll thumbnails */
  useEffect(() => {
    if (thumbnailStripRef.current) {
      thumbnailStripRef.current.scrollTo({ left: thumbnailStripRef.current.scrollWidth, behavior: "smooth" });
    }
  }, [cards.length]);

  /* ─── Play audio ─── */
  const playAudio = useCallback(async (chunks: ArrayBuffer[]) => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    try {
      const blob = new Blob(chunks);
      const arrayBuf = await blob.arrayBuffer();

      // Clone the buffer because decodeAudioData detaches the buffer it receives
      const arrayBufCopy = arrayBuf.slice(0);

      let audioBuf: AudioBuffer;
      try {
        // Try decoding as standard containerised audio (MP3, WAV, etc)
        audioBuf = await ctx.decodeAudioData(arrayBuf);
      } catch (decodeError) {
        console.warn("Standard audio decoding failed, attempting to parse as raw PCM f32le 44.1kHz...", decodeError);

        // Use the CLONED buffer here (the original is detached now)
        const floatData = new Float32Array(arrayBufCopy);

        // We assume 44100Hz and Mono (1 channel) for most TTS
        const sampleRate = 44100;
        audioBuf = ctx.createBuffer(1, floatData.length, sampleRate);
        audioBuf.getChannelData(0).set(floatData);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(ctx.destination);
      source.start(0);
      setAppState("speaking");
      setStatus("Speaking");
      source.onended = () => { setAppState("idle"); setStatus("Ready"); };
    } catch (finalError) {
      console.error("Final audio playback error:", finalError);
      setAppState("idle");
      setStatus("Audio playback error");
    }
  }, []);

  /* ─── WebSocket ─── */
  const connectWS = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    setConnectionStatus("connecting");
    setStatus("Connecting");

    const ws = new WebSocket("ws://localhost:8000/ws/voice");
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { setConnectionStatus("connected"); setStatus("Ready"); setAppState("idle"); };
    ws.onerror = () => { setConnectionStatus("error"); setStatus("Connection failed"); };
    ws.onclose = () => { setConnectionStatus("disconnected"); setStatus("Disconnected"); setAppState("idle"); };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "visualisation" && msg.data) {
            handleVisualisation(msg);
          } else if (msg.type === "transcription" && msg.data) {
            lastTranscriptionRef.current = msg.data;
          }
        } catch { /* ignore */ }
        return;
      }

      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();

      if (!isReceivingAudioRef.current) {
        isReceivingAudioRef.current = true;
        responseAudioChunksRef.current = [];
        setAppState("receiving");
        setStatus("Receiving");
      }

      responseAudioChunksRef.current.push(event.data as ArrayBuffer);

      const timeout = Math.max(500, responseAudioChunksRef.current.length * 1.5);
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = setTimeout(async () => {
        if (responseAudioChunksRef.current.length > 0 && isReceivingAudioRef.current) {
          isReceivingAudioRef.current = false;
          const chunksToPlay = responseAudioChunksRef.current.slice();
          responseAudioChunksRef.current = [];
          await playAudio(chunksToPlay);
        }
      }, timeout);
    };

    socketRef.current = ws;
  }, [handleVisualisation, playAudio]);

  useEffect(() => {
    connectWS();
    return () => { socketRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Recording ─── */
  const startRecording = useCallback(async () => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        setAppState("sending");
        setStatus("Sending");
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const buffer = await blob.arrayBuffer();
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(buffer);
          setAppState("processing");
          setStatus("Thinking");
        } else {
          setStatus("Not connected");
          setAppState("idle");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setAppState("recording");
      setStatus("Listening");
    } catch {
      setStatus("Microphone unavailable");
    }
  }, []);

  const stopRecording = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") { r.stop(); r.stream.getTracks().forEach((t) => t.stop()); }
  }, []);

  /* ─── Derived ─── */
  const isRecording = appState === "recording";
  const isBusy = ["sending", "processing", "receiving", "speaking"].includes(appState);
  const canRecord = connectionStatus === "connected" && !isRecording && !isBusy;

  const dotColor =
    connectionStatus === "connected" ? "bg-[var(--color-text)]" :
      connectionStatus === "connecting" ? "bg-[var(--color-text-muted)]" :
        "bg-[var(--color-text-muted)]";

  const hasCards = cards.length > 0;
  const activeCard = hasCards ? cards[activeIndex] : null;
  const isLatest = activeIndex === cards.length - 1;

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-semibold tracking-tight">maestro</span>
          <span className="text-[11px] text-[var(--color-text-muted)] tracking-wide uppercase">voice tutor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {connectionStatus === "connected" ? "Connected" :
              connectionStatus === "connecting" ? "Connecting" : "Offline"}
          </span>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-hidden flex flex-col">

        {/* ─── Card Viewer ─── */}
        <div className="flex-1 overflow-hidden relative">
          {activeCard ? (
            <div className="animate-fade-in w-full h-full">
              {activeCard.failed ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center max-w-sm px-6">
                    <div className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
                      <AlertIcon />
                    </div>
                    <p className="text-sm font-medium mb-1">Diagram couldn&apos;t render</p>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      The AI generated a diagram with syntax errors. Try asking again.
                    </p>
                  </div>
                </div>
              ) : (
                <EducationalCard data={activeCard.data} cardId={activeCard.id} />
              )}

              {/* Jump to latest */}
              {!isLatest && (
                <button
                  onClick={() => setActiveIndex(cards.length - 1)}
                  className="absolute top-4 right-4 h-8 px-3 bg-[var(--color-text)] text-white text-[11px] font-medium rounded-full flex items-center gap-1.5 hover:opacity-80 transition-opacity z-10"
                >
                  <ArrowUpIcon /> Latest
                </button>
              )}

              {/* Position indicator */}
              <div className="absolute bottom-4 left-4 text-[11px] text-[var(--color-text-muted)] z-10">
                {activeIndex + 1} / {cards.length}
                <span className="mx-1.5">·</span>
                {activeCard.label}
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center animate-float">
              <div className="text-center max-w-xs px-6">
                <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                  Diagrams will appear here as you ask questions
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Thumbnail Strip ─── */}
        {cards.length > 1 && (
          <div className="border-t border-[var(--color-border-subtle)]">
            <div ref={thumbnailStripRef} className="flex gap-2 px-6 py-3 overflow-x-auto scrollbar-thin">
              {cards.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setActiveIndex(i)}
                  className={`flex-shrink-0 rounded-lg border transition-all duration-150 overflow-hidden relative group
                    ${i === activeIndex
                      ? "border-[var(--color-text)] shadow-sm"
                      : "border-[var(--color-border)] hover:border-[var(--color-text-secondary)]"
                    }`}
                  style={{ width: 100, height: 60 }}
                >
                  {c.failed ? (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface-alt)]">
                      <AlertIcon />
                    </div>
                  ) : c.thumbnailSvg ? (
                    <div
                      className="w-full h-full flex items-center justify-center bg-white overflow-hidden pointer-events-none"
                      style={{ transform: "scale(0.2)", transformOrigin: "center center", width: "500%", height: "500%", marginLeft: "-200%", marginTop: "-200%" }}
                      dangerouslySetInnerHTML={{ __html: c.thumbnailSvg }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface-alt)]">
                      <span className="text-[9px] text-[var(--color-text-muted)] px-2 text-center truncate">{c.label}</span>
                    </div>
                  )}

                  {/* Number badge */}
                  <span className={`absolute top-1 left-1 text-[9px] font-medium px-1 rounded
                    ${i === activeIndex ? "bg-[var(--color-text)] text-white" : "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                    {i + 1}
                  </span>

                  {/* Hover label */}
                  <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1">
                    <span className="text-[9px] text-white block truncate">{c.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ─── Controls ─── */}
      <div className="border-t border-[var(--color-border)] px-6 py-5">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!canRecord && !isRecording}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none
              ${isRecording
                ? "bg-[var(--color-text)] text-white scale-105"
                : canRecord
                  ? "bg-[var(--color-text)] text-white hover:opacity-80"
                  : "bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed"
              }`}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-[var(--color-text)] animate-pulse-ring" />
            )}
            <span className="relative z-10">
              {isRecording ? <StopIcon /> : <MicIcon />}
            </span>
          </button>

          <div className="flex items-center gap-2 h-5">
            {isBusy && (
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[var(--color-text)] animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-[var(--color-text)] animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-[var(--color-text)] animate-bounce [animation-delay:300ms]" />
              </span>
            )}
            <span className="text-[12px] text-[var(--color-text-muted)]">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
