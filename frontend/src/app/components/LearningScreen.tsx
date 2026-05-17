"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import EducationalCard, { type StructuredVis } from "./EducationalCard";
import SyllabusPanel from "./SyllabusPanel";
import VoiceOrb from "./VoiceOrb";
import {
  decodeAudioForPlayback,
  type AudioChunk,
  type PlaybackAudioFormat,
} from "../lib/audioPlayback";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Types ─── */
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
type AppState = "idle" | "recording" | "sending" | "processing" | "receiving" | "speaking";
type VisualMode = "orb" | "viz";

interface Message {
  id: string;
  role: "user" | "tutor";
  text: string;
}

interface CardEntry {
  id: string;
  label: string;
  data: StructuredVis;
}

export default function LearningScreen({
  syllabusId,
  syllabusTitle,
  contentJson,
  onHome,
}: {
  syllabusId?: string;
  syllabusTitle?: string;
  contentJson?: Record<string, unknown> | null;
  onHome: () => void;
}) {
  const [status, setStatus] = useState("Connecting...");
  const [appState, setAppState] = useState<AppState>("idle");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [visualMode, setVisualMode] = useState<VisualMode>("orb");

  /* ─── Card history & Transcripts ─── */
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const lastTranscriptionRef = useRef("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  /* ─── Syllabus panel ─── */
  const contentNodes = (contentJson?.content_nodes as { title: string; concept?: string }[]) ?? [];
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [showSyllabus, setShowSyllabus] = useState(false);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showTranscript]);

  /* ─── Audio / WebSocket refs ─── */
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const responseAudioChunksRef = useRef<AudioChunk[]>([]);
  const pendingRawAudioBytesRef = useRef<Uint8Array<ArrayBufferLike>>(
    new Uint8Array(0) as Uint8Array<ArrayBufferLike>
  );
  const audioFormatRef = useRef<PlaybackAudioFormat | null>(null);
  const isReceivingAudioRef = useRef(false);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackChainRef = useRef<Promise<void>>(Promise.resolve());
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const unmountedRef = useRef(false);

  const truncateLabel = (text: string, max = 32) =>
    text.length > max ? text.slice(0, max) + "\u2026" : text;

  /* ─── Handle incoming visualisation ─── */
  const handleVisualisation = useCallback(
    (msg: { type: string; format?: string; data: unknown }) => {
      if (typeof msg.data !== "object" || msg.data === null) return;
      const label = truncateLabel(lastTranscriptionRef.current || "Diagram");
      const visData = msg.data as StructuredVis;
      const entry: CardEntry = {
        id: `card-${Date.now()}`,
        label: visData.title || label,
        data: visData,
      };
      setCards((prev) => {
        const next = [...prev, entry];
        setActiveIndex(next.length - 1);
        return next;
      });
      setVisualMode("viz");
    },
    []
  );

  /* ─── Play audio ─── */
  const playAudio = useCallback(async (chunks: AudioChunk[]) => {
    if (chunks.length === 0 || unmountedRef.current) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(audioContextRef.current.destination);
      analyserNodeRef.current = analyser;
      setAnalyserNode(analyser);
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    try {
      const { audioBuffer, pendingRawBytes } = await decodeAudioForPlayback({
        audioContext: ctx,
        chunks,
        audioFormat: audioFormatRef.current,
        pendingRawBytes: pendingRawAudioBytesRef.current,
      });
      pendingRawAudioBytesRef.current = pendingRawBytes;
      if (!audioBuffer) return;

      return new Promise<void>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyserNodeRef.current ?? ctx.destination);
        activeSourceRef.current = source;
        source.start(0);
        setAppState("speaking");
        setStatus("Speaking");
        source.onended = () => {
          activeSourceRef.current = null;
          setAppState("idle");
          setStatus("Ready");
          resolve();
        };
      });
    } catch (e) {
      console.error("Audio playback error:", e);
      setAppState("idle");
      setStatus("Audio error");
    }
  }, []);

  /* ─── WebSocket ─── */
  const connectWS = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    setConnectionStatus("connecting");
    setStatus("Connecting...");

    const params = new URLSearchParams();
    if (syllabusId) params.append("syllabus_id", syllabusId);
    const token = localStorage.getItem("maestro_token");
    if (token) params.append("token", token);

    const wsUrl = `ws://localhost:8000/ws/voice?${params.toString()}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    pendingRawAudioBytesRef.current = new Uint8Array(0) as Uint8Array<ArrayBufferLike>;
    audioFormatRef.current = null;

    ws.onopen = () => {
      setConnectionStatus("connected");
      setAppState("receiving");
      setStatus("Speaking");
    };
    ws.onerror = () => {
      setConnectionStatus("error");
      setStatus("Connection failed");
    };
    ws.onclose = () => {
      setConnectionStatus("disconnected");
      setStatus("Disconnected");
      setAppState("idle");
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "audio_format") {
            audioFormatRef.current = msg.data;
          } else if (msg.type === "session_state") {
            setCurrentNodeIndex(msg.current_node_index ?? 0);
            setIsSessionComplete(msg.is_completed ?? false);
          } else if (msg.type === "node_advance") {
            setCurrentNodeIndex(msg.index ?? 0);
          } else if (msg.type === "course_complete") {
            setIsSessionComplete(true);
          } else if (msg.type === "visualisation" && msg.data) {
            handleVisualisation(msg);
          } else if (msg.type === "transcription" && msg.data) {
            lastTranscriptionRef.current = msg.data;
            setMessages((prev) => [...prev, { id: `msg-${Date.now()}`, role: "user", text: msg.data }]);
          } else if (msg.type === "tutor_transcription" && msg.data) {
            setMessages((prev) => [...prev, { id: `tutor-${Date.now()}`, role: "tutor", text: msg.data }]);
          } else if (msg.type === "greeting_complete") {
            setMessages((prev) => [...prev, { id: `greet-${Date.now()}`, role: "tutor", text: msg.data }]);
            setStatus("Ready");
          }
        } catch {
          /* ignore */
        }
        return;
      }

      // Binary audio data
      if (unmountedRef.current) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();
      if (unmountedRef.current) return;

      if (!isReceivingAudioRef.current) {
        isReceivingAudioRef.current = true;
        responseAudioChunksRef.current = [];
        setAppState("receiving");
      }

      responseAudioChunksRef.current.push(event.data as AudioChunk);

      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = setTimeout(async () => {
        if (responseAudioChunksRef.current.length > 0 && isReceivingAudioRef.current) {
          isReceivingAudioRef.current = false;
          const chunksToPlay = responseAudioChunksRef.current.slice();
          responseAudioChunksRef.current = [];
          playbackChainRef.current = playbackChainRef.current.then(() => playAudio(chunksToPlay));
        }
      }, 150);
    };

    socketRef.current = ws;
  }, [syllabusId, handleVisualisation, playAudio]);

  useEffect(() => {
    unmountedRef.current = false;
    connectWS();
    return () => {
      unmountedRef.current = true;
      socketRef.current?.close();
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      try { activeSourceRef.current?.stop(); } catch { /* already ended */ }
      activeSourceRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setAppState("sending");
        setStatus("Sending...");
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const buffer = await blob.arrayBuffer();
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(buffer);
          setAppState("processing");
          setStatus("Thinking...");
        } else {
          setStatus("Not connected");
          setAppState("idle");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setAppState("recording");
      setStatus("Listening...");
    } catch {
      setStatus("Microphone unavailable");
    }
  }, []);

  const stopRecording = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") {
      r.stop();
      r.stream.getTracks().forEach((t) => t.stop());
    }
  }, []);

  /* ─── Spacebar push-to-talk ─── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      // Don't capture if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!canRecord || isRecording) return;
      e.preventDefault();
      startRecording();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (isRecording) stopRecording();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  /* ─── Derived state ─── */
  const isRecording = appState === "recording";
  const isBusy = ["sending", "processing", "receiving", "speaking"].includes(appState);
  const canRecord = connectionStatus === "connected" && !isRecording && !isBusy;

  const orbState: "idle" | "speaking" | "recording" | "processing" =
    appState === "speaking" || appState === "receiving"
      ? "speaking"
      : appState === "recording"
        ? "recording"
        : appState === "processing" || appState === "sending"
          ? "processing"
          : "idle";

  const hasCards = cards.length > 0;
  const activeCard = hasCards ? cards[activeIndex] : null;

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-6 sm:px-8 h-16 z-20 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)]/50">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onHome}
            className="text-lg font-bold tracking-tighter text-[var(--color-text)] hover:opacity-70 transition-opacity focus:outline-none shrink-0"
          >
            maestro
          </button>

          {/* Mini orb in header when in viz mode */}
          {visualMode === "viz" && (
            <div className="shrink-0 ml-1">
              <VoiceOrb analyserNode={analyserNode} state={orbState} size={36} />
            </div>
          )}

          {syllabusTitle && (
            <span className="text-sm text-[var(--color-text-muted)] truncate max-w-[200px] sm:max-w-[300px] ml-1">
              {syllabusTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {contentNodes.length > 0 && (
            <button
              onClick={() => setShowSyllabus(v => !v)}
              className={`flex items-center px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border rounded-full transition-all focus:outline-none ${
                showSyllabus
                  ? "bg-[var(--color-surface-alt)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-border)]"
                  : "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]"
              }`}
            >
              {showSyllabus ? "Hide Syllabus" : "Syllabus"}
            </button>
          )}
          <button
            onClick={() => setShowTranscript(v => !v)}
            className={`flex items-center px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border rounded-full transition-all focus:outline-none ${
                showTranscript
                  ? "bg-[var(--color-surface-alt)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-border)]"
                  : "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]"
            }`}
          >
            {showTranscript ? "Hide Transcript" : "Show Transcript"}
          </button>

          {connectionStatus !== "connected" && connectionStatus !== "connecting" && (
            <button
              onClick={connectWS}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-full hover:border-[var(--color-text)] transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Reconnect
            </button>
          )}
        </div>
      </header>

      {/* ─── Main Content & Split Panel ─── */}
      <main className="flex-1 overflow-hidden relative flex">

        {/* ─── Left Sidebar: Syllabus Panel ─── */}
        <AnimatePresence>
          {showSyllabus && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "25%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full shrink-0 overflow-hidden z-40"
            >
              <SyllabusPanel
                nodes={contentNodes}
                currentIndex={currentNodeIndex}
                isCompleted={isSessionComplete}
                syllabusTitle={syllabusTitle}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Visual Content (Flexible Width) */}
        <div
          className="relative h-full transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex-1"
        >
          <AnimatePresence mode="wait">
            {visualMode === "orb" ? (
              <motion.div
                key="orb-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full h-full flex flex-col items-center justify-center"
              >
                {/* Ambient glow */}
                <motion.div
                  animate={{
                    opacity: orbState === "speaking" || orbState === "recording" ? 0.7 : 0.2,
                    scale: orbState === "speaking" || orbState === "recording" ? 1.15 : 1,
                  }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(30,200,120,0.3) 0%, rgba(10,140,80,0.08) 45%, transparent 70%)",
                    filter: "blur(50px)",
                  }}
                />

                <VoiceOrb analyserNode={analyserNode} state={orbState} size={340} />

                {/* Status text */}
                <div className="h-8 mt-8 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {appState === "processing" || appState === "sending" ? (
                      <motion.div
                        key="dots"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-1.5"
                      >
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-amber-400"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </motion.div>
                    ) : (
                      <motion.p
                        key="text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] font-medium text-[var(--color-text-muted)] tracking-[0.15em] uppercase"
                      >
                        {status}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="viz-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full pb-20"
              >
              <AnimatePresence mode="wait">
                {activeCard && (
                  <EducationalCard key={activeCard.id} data={activeCard.data} cardId={activeCard.id} />
                )}
              </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Floating Dock (Anchored inside visual block) ─── */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
            <div className="glass-panel rounded-full px-5 py-2.5 flex items-center gap-3 shadow-2xl">
              {/* Card nav — only in viz mode with multiple cards */}
              {visualMode === "viz" && hasCards && (
                <>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                      disabled={activeIndex <= 0}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-medium text-[var(--color-text-muted)] tabular-nums min-w-[32px] text-center">
                      {activeIndex + 1}/{cards.length}
                    </span>
                    <button
                      onClick={() => setActiveIndex((i) => Math.min(cards.length - 1, i + 1))}
                      disabled={activeIndex >= cards.length - 1}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-[1px] h-5 bg-[var(--color-border)] opacity-50" />
                </>
              )}

              {/* Status */}
              <div className="flex items-center min-w-[60px]">
                <AnimatePresence mode="wait">
                  {isBusy ? (
                    <motion.div
                      key="busy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5"
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1 h-1 rounded-full bg-[var(--color-text)]"
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                      <span className="text-[11px] font-medium tracking-wide ml-1.5">{status}</span>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] text-[var(--color-text-muted)] font-medium tracking-wide whitespace-nowrap"
                    >
                      {canRecord ? "Hold space to talk" : status}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-[1px] h-5 bg-[var(--color-border)] opacity-50" />

              {/* Mic button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!canRecord && !isRecording}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none
                  ${
                    isRecording
                      ? "bg-[var(--color-text)] text-[var(--color-bg)] scale-110"
                      : canRecord
                        ? "bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90 hover:scale-105"
                        : "bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed"
                  }`}
              >
                {isRecording && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-[var(--color-text)]/30"
                    animate={{ scale: [1, 1.4], opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                  />
                )}
                <span className="relative z-10">
                  {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Right Sidebar: Chat Transcript (25% Width) ─── */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "25%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full border-l border-[var(--color-border-subtle)] bg-[var(--color-surface)]/30 flex flex-col shadow-2xl relative z-40 overflow-hidden shrink-0"
            >
              <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/80 backdrop-blur-md">
                <h3 className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">
                  Transcript
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin pb-32">
                {messages.length === 0 && (
                  <p className="text-[12px] text-center text-[var(--color-text-muted)] mt-10 tracking-wide uppercase font-medium">Session Started</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 px-1 font-bold">
                      {msg.role === "user" ? "You" : "Tutor"}
                    </span>
                    <div className={`p-4 rounded-2xl max-w-[95%] text-[13.5px] leading-relaxed shadow-sm ${
                      msg.role === "user" 
                        ? "bg-[var(--color-text)] text-[var(--color-bg)] rounded-tr-sm" 
                        : "bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
