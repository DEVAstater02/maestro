"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthScreen from "./components/AuthScreen";
import VoiceOrb from "./components/VoiceOrb";

import DashboardScreen from "./components/DashboardScreen";

type FlowState = "loading" | "auth" | "dashboard" | "splash" | "curation";

import { ThemeToggle } from "./components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Sparkles, ArrowUp, Loader2 } from "lucide-react";

export default function App() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState>("loading");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Science");

  // Status for Curation
  const [curationStatus, setCurationStatus] = useState("Initializing...");
  const [curationText, setCurationText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const responseAudioChunksRef = useRef<ArrayBuffer[]>([]);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReceivingAudioRef = useRef(false);
  const playbackChainRef = useRef<Promise<void>>(Promise.resolve());

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
      setIsSpeaking(true);
      const blob = new Blob(chunks);
      const arrayBuf = await blob.arrayBuffer();
      if (arrayBuf.byteLength === 0) {
        setIsSpeaking(false);
        return;
      }

      // Clone the buffer because decodeAudioData detaches the original
      const arrayBufCopy = arrayBuf.slice(0);

      let audioBuf: AudioBuffer;
      try {
        // Try decoding as standard containerised audio (MP3, WAV from ElevenLabs)
        audioBuf = await ctx.decodeAudioData(arrayBuf);
      } catch (decodeError) {
        console.warn("Standard audio decoding failed, attempting raw PCM f32le 44.1kHz (Cartesia)...", decodeError);

        const floatData = new Float32Array(arrayBufCopy);
        if (floatData.length === 0) {
          setIsSpeaking(false);
          return;
        }

        audioBuf = ctx.createBuffer(1, floatData.length, 44100);
        audioBuf.getChannelData(0).set(floatData);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(analyserNodeRef.current ?? ctx.destination);
      source.start(0);
      return new Promise<void>(resolve => { 
        source.onended = () => {
          setIsSpeaking(false);
          resolve();
        }; 
      });
    } catch (e) {
      console.error("Audio playback error", e);
      setIsSpeaking(false);
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
          const syllabusId = msg.data?._id;
          ws.close();
          if (syllabusId) {
            router.push(`/learn/${syllabusId}`);
          }
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
            
            // Sequence playback to avoid overlapping
            playbackChainRef.current = playbackChainRef.current.then(() => playAudio(chunksToPlay));
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
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  // ── Spacebar push-to-talk ────────────────────────────────────────────────
  useEffect(() => {
    if (flow !== "curation") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (curationStatus !== "waiting_for_input" || isSpeaking || isRecording) return;
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
  }, [flow, curationStatus, isSpeaking, isRecording]);

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
        }}
        onResumeSyllabus={(_syllabus: any, syllabusId: string) => {
          router.push(`/learn/${syllabusId}`);
        }}
      />
    );
  }

  // ── Splash (start learning) ──────────────────────────────────────────────
  if (flow === "splash") {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6 relative overflow-hidden"
      >
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 h-20 z-10"
        >
          <button 
            onClick={() => setFlow("dashboard")}
            className="text-xl font-bold tracking-tighter hover:opacity-70 transition-opacity focus:outline-none"
          >
            maestro
          </button>
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-[var(--color-text-muted)] font-medium hidden sm:inline-block">
                Hi, <span className="text-[var(--color-text)]">{userName}</span>
              </span>
            )}
            <ThemeToggle />
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] rounded-full px-4 py-2"
            >
              Sign Out
            </button>
          </div>
        </motion.header>

        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-[var(--color-text)]/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl w-full text-center space-y-8 z-10"
        >
          <div>
            <motion.h1 
              className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              What do you want to learn?
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="w-full relative group mx-auto"
          >
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 mt-6">
              <div className="flex items-center w-full bg-[#f4f4f4] dark:bg-[#2f2f2f] rounded-[26px] p-1.5 pl-4 shadow-sm focus-within:shadow-md transition-shadow">
                <input
                  id="topic-input"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Quantum Physics, LLMs, Math ..."
                  className="flex-1 bg-transparent py-2.5 px-2 text-[15px] text-[var(--color-text)] focus:outline-none placeholder:text-[#8e8e8e] dark:placeholder:text-[#9e9e9e]"
                  autoComplete="off"
                  onKeyDown={e => {
                    if (e.key === "Enter" && topic) {
                      startCuration();
                    }
                  }}
                />

                <button
                  id="start-learning-btn"
                  onClick={startCuration}
                  disabled={!topic}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-all shrink-0 mr-1
                    ${topic 
                      ? "bg-black text-white dark:bg-white dark:text-black" 
                      : "bg-[#e5e5e5] text-white dark:bg-[#676767] dark:text-[#2f2f2f] cursor-not-allowed"
                    }`}
                >
                  <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Curation screen ──────────────────────────────────────────────────────
  if (flow === "curation") {
    const orbActive = isRecording || isSpeaking;
    const orbState = isSpeaking ? "speaking" : isRecording ? "recording" : isProcessing ? "processing" : "idle";
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden relative"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-8 h-16 z-20 relative">
          <button
            onClick={() => {
              socketRef.current?.close();
              setFlow("dashboard");
            }}
            className="text-lg font-bold tracking-tighter text-[var(--color-text)]/80 hover:text-[var(--color-text)] transition-colors focus:outline-none"
          >
            maestro
          </button>
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-[var(--color-text-muted)] font-medium hidden sm:inline">
                {userName}
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content – centered orb */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10">
          {curationStatus === "generating_syllabus" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="relative w-20 h-20">
                <Loader2 className="w-full h-full text-[var(--color-text)] animate-spin" strokeWidth={1.5} />
              </div>
              <div className="space-y-3 text-center">
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Creating your syllabus</h3>
                <p className="text-base text-[var(--color-text-muted)] max-w-sm mx-auto">
                  Maestro is building a learning path perfectly tailored to you.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-10"
            >
              {/* ── THE ORB ── */}
              <div className="relative flex items-center justify-center">
                {/* Outermost ambient room glow */}
                <motion.div
                  animate={{
                    opacity: orbActive ? 0.7 : 0.2,
                    scale: orbActive ? 1.15 : 1,
                  }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, rgba(30,200,120,0.3) 0%, rgba(10,140,80,0.08) 45%, transparent 70%)',
                    filter: 'blur(50px)',
                  }}
                />

                {/* Canvas-based audio-reactive orb */}
                <VoiceOrb
                  analyserNode={analyserNode}
                  state={orbState}
                  size={340}
                />
              </div>

              {/* Status text below orb */}
              <div className="h-8 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex gap-1.5"
                    >
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-teal-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.p
                      key="status-text"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-sm font-medium text-[var(--color-text-muted)] tracking-wider uppercase"
                      style={{ fontSize: '11px', letterSpacing: '0.15em' }}
                    >
                      {isRecording ? "Listening..." : isSpeaking ? "Speaking" : "Hold space to talk"}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Hidden interactive mic button – functional but invisible, keyboard-driven */}
              <button
                id="record-btn"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={isRecording ? stopRecording : undefined}
                disabled={curationStatus !== "waiting_for_input" || isSpeaking}
                className="sr-only"
                aria-label="Hold to record"
              />
            </motion.div>
          )}
        </main>
      </motion.div>
    );
  }

  return null;
}
