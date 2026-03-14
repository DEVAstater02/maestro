"use client";

import { useState, useRef, useEffect } from "react";
import LearningScreen from "./components/LearningScreen";
import AuthScreen from "./components/AuthScreen";

import DashboardScreen from "./components/DashboardScreen";

type FlowState = "loading" | "auth" | "dashboard" | "splash" | "curation" | "learning";

import { ThemeToggle } from "./components/ThemeToggle";

export default function App() {
  const [flow, setFlow] = useState<FlowState>("loading");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Science");
  const [finalSyllabus, setFinalSyllabus] = useState<any>(null);
  const [activeSyllabusId, setActiveSyllabusId] = useState<string | undefined>(undefined);

  // Status for Curation
  const [curationStatus, setCurationStatus] = useState("Initializing...");
  const [curationText, setCurationText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const responseAudioChunksRef = useRef<ArrayBuffer[]>([]);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReceivingAudioRef = useRef(false);

  // ── On mount: check for a stored token ──────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem("maestro_token");
    const storedName  = localStorage.getItem("maestro_name");

    if (!storedToken) {
      setFlow("auth");
      return;
    }

    // Validate the stored token against /api/auth/me
    fetch("http://localhost:8000/api/auth/me", {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(res => {
        if (res.ok) {
          setAuthToken(storedToken);
          setUserName(storedName ?? "");
            setFlow("dashboard");
        } else {
          // Token expired or invalid – clear and show auth
          localStorage.removeItem("maestro_token");
          localStorage.removeItem("maestro_user_id");
          localStorage.removeItem("maestro_name");
          setFlow("auth");
        }
      })
      .catch(() => {
        // Server unreachable – still allow cached session for offline UX
        if (storedToken) {
          setAuthToken(storedToken);
          setUserName(storedName ?? "");
            setFlow("dashboard");
        } else {
          setFlow("auth");
        }
      });
  }, []);

  const handleAuthenticated = (token: string, userId: string, name: string) => {
    setAuthToken(token);
    setUserName(name);
    setFlow("dashboard");
  };

  const handleSignOut = () => {
    localStorage.removeItem("maestro_token");
    localStorage.removeItem("maestro_user_id");
    localStorage.removeItem("maestro_name");
    setAuthToken(null);
    setUserName("");
    setFlow("auth");
  };

  // ── Audio playback ───────────────────────────────────────────────────────
  const playAudio = async (chunks: ArrayBuffer[]) => {
    if (chunks.length === 0) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    try {
      const blob = new Blob(chunks);
      const arrayBuf = await blob.arrayBuffer();
      if (arrayBuf.byteLength === 0) return;

      const floatData = new Float32Array(arrayBuf);
      if (floatData.length === 0) return;

      const audioBuf = ctx.createBuffer(1, floatData.length, 44100);
      audioBuf.getChannelData(0).set(floatData);

      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(ctx.destination);
      source.start(0);
      return new Promise(resolve => { source.onended = resolve; });
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  const startCuration = () => {
    setFlow("curation");
    const wsUrl = authToken
      ? `ws://localhost:8000/api/ws/curation?token=${encodeURIComponent(authToken)}`
      : "ws://localhost:8000/api/ws/curation";

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ topic, user_persona: userName || "A student", subject }));
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        if (msg.type === "status") {
          setCurationStatus(msg.data);
          setCurationText(msg.text);
          setIsProcessing(false);
        } else if (msg.type === "transcription") {
          setTranscription(msg.data);
        } else if (msg.type === "final_syllabus") {
          setFinalSyllabus(msg.data);
          setActiveSyllabusId(msg.data?._id);
          setFlow("learning");
          ws.close();
        }
      } else {
        if (!isReceivingAudioRef.current) {
          isReceivingAudioRef.current = true;
          responseAudioChunksRef.current = [];
        }
        responseAudioChunksRef.current.push(event.data as ArrayBuffer);

        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = setTimeout(async () => {
          if (responseAudioChunksRef.current.length > 0) {
            isReceivingAudioRef.current = false;
            const chunksToPlay = [...responseAudioChunksRef.current];
            responseAudioChunksRef.current = [];
            await playAudio(chunksToPlay);
          }
        }, 150);
      }
    };
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];
    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current);
      const buffer = await blob.arrayBuffer();
      socketRef.current?.send(buffer);
      setIsProcessing(true);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // ── Loading screen ───────────────────────────────────────────────────────
  if (flow === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-text)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--color-text-muted)]">Loading maestro...</p>
        </div>
      </div>
    );
  }

  // ── Auth screen ──────────────────────────────────────────────────────────
  if (flow === "auth") {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  if (flow === "dashboard") {
    return (
      <DashboardScreen
        userName={userName}
        authToken={authToken || ""}
        onSignOut={handleSignOut}
        onStartNew={() => {
          setFlow("splash");
          setActiveSyllabusId(undefined);
        }}
        onResumeSyllabus={(syllabus: any, syllabusId: string) => {
          setFinalSyllabus(syllabus);
          setActiveSyllabusId(syllabusId);
          setFlow("learning");
        }}
      />
    );
  }

  // ── Splash (start learning) ──────────────────────────────────────────────
  if (flow === "splash") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        {/* Header with user info + sign out */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 h-14 border-b border-[var(--color-border)]">
          <button 
            onClick={() => setFlow("dashboard")}
            className="text-base font-semibold tracking-tight hover:opacity-70 transition-opacity focus:outline-none"
          >
            maestro
          </button>
          <div className="flex items-center gap-3">
            {userName && (
              <span className="text-xs text-[var(--color-text-muted)]">
                Hi, <span className="font-medium text-[var(--color-text)]">{userName}</span>
              </span>
            )}
            <ThemeToggle />
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border)] rounded-full px-3 py-1"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">maestro</h1>
            <p className="text-[var(--color-text-muted)]">Your personalized AI voice tutor</p>
          </div>

          <div className="space-y-4 text-left bg-[var(--color-surface-alt)] p-6 rounded-2xl border border-[var(--color-border)]">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">What do you want to learn?</label>
              <input
                id="topic-input"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Quantum Physics, Spanish Verbs..."
                className="w-full bg-transparent border-b border-[var(--color-border)] py-2 focus:outline-none focus:border-[var(--color-text)] transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Subject</label>
              <input
                id="subject-input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-transparent border-b border-[var(--color-border)] py-2 focus:outline-none focus:border-[var(--color-text)] transition-colors"
              />
            </div>
          </div>

          <button
            id="start-learning-btn"
            onClick={startCuration}
            disabled={!topic}
            className="w-full py-4 bg-[var(--color-text)] text-[var(--color-bg)] rounded-full font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  // ── Curation screen ──────────────────────────────────────────────────────
  if (flow === "curation") {
    return (
      <div className="h-screen flex flex-col bg-[var(--color-bg)]">
        <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => {
                socketRef.current?.close();
                setFlow("dashboard");
              }}
              className="flex items-center gap-2.5 hover:opacity-70 transition-opacity focus:outline-none"
            >
              <span className="text-base font-semibold tracking-tight">maestro</span>
              <span className="text-[11px] text-[var(--color-text-muted)] tracking-wide uppercase">Curation</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {userName && (
              <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
                {userName}
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8">
          <div className="max-w-lg space-y-4">
            <p className="text-sm text-[var(--color-text-muted)] uppercase tracking-widest font-bold">Step 1: Customizing your experience</p>
            <h2 className="text-2xl font-medium leading-tight">{curationText || "Let's personalize your learning path..."}</h2>
            {transcription && (
              <div className="mt-4 p-4 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] animate-fade-in">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">You said:</p>
                <p className="text-sm italic">"{transcription}"</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              id="record-btn"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              disabled={curationStatus !== "waiting_for_input"}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all 
                ${isRecording ? 'bg-red-500 scale-110' : 'bg-[var(--color-text)]'} 
                ${curationStatus !== "waiting_for_input" ? 'opacity-20 cursor-not-allowed grayscale' : 'opacity-100'} 
                text-[var(--color-bg)] shadow-xl relative`}
            >
              {isRecording && <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring opacity-50" />}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <div className="h-6 flex items-center gap-2">
              {isProcessing && (
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text)] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text)] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text)] animate-bounce [animation-delay:300ms]" />
                </span>
              )}
              <p className="text-xs text-[var(--color-text-muted)]">
                {isRecording ? "Listening..." : isProcessing ? "Thinking..." : "Hold to talk"}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <LearningScreen 
      initialSyllabus={finalSyllabus} 
      syllabusId={activeSyllabusId}
      onHome={() => setFlow("dashboard")}
    />
  );
}
