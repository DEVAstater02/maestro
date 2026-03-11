"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import LearningScreen from "./components/LearningScreen";

type FlowState = "splash" | "curation" | "learning";

export default function App() {
  const [flow, setFlow] = useState<FlowState>("splash");
  const [topic, setTopic] = useState("");
  const [userPersona, setUserPersona] = useState("A 7th grade student");
  const [subject, setSubject] = useState("Science");
  const [finalSyllabus, setFinalSyllabus] = useState<any>(null);

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
      return new Promise((resolve) => {
        source.onended = resolve;
      });
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  const startCuration = () => {
    setFlow("curation");
    const ws = new WebSocket("ws://localhost:8000/api/ws/curation");
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ topic, user_persona: userPersona, subject }));
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
        }, 150); // Small delay to aggregate chunks
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

  if (flow === "splash") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">maestro</h1>
            <p className="text-[var(--color-text-muted)]">Your personalized AI voice tutor</p>
          </div>

          <div className="space-y-4 text-left bg-[var(--color-surface-alt)] p-6 rounded-2xl border border-[var(--color-border)]">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">What do you want to learn?</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Quantum Physics, Spanish Verbs..."
                className="w-full bg-transparent border-b border-[var(--color-border)] py-2 focus:outline-none focus:border-[var(--color-text)] transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-transparent border-b border-[var(--color-border)] py-2 focus:outline-none focus:border-[var(--color-text)] transition-colors"
              />
            </div>
          </div>

          <button
            onClick={startCuration}
            disabled={!topic}
            className="w-full py-4 bg-[var(--color-text)] text-white rounded-full font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  if (flow === "curation") {
    return (
      <div className="h-screen flex flex-col bg-white">
        <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold tracking-tight">maestro</span>
            <span className="text-[11px] text-[var(--color-text-muted)] tracking-wide uppercase">Curation</span>
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
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              disabled={curationStatus !== "waiting_for_input"}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all 
                ${isRecording ? 'bg-red-500 scale-110' : 'bg-[var(--color-text)]'} 
                ${curationStatus !== "waiting_for_input" ? 'opacity-20 cursor-not-allowed grayscale' : 'opacity-100'} 
                text-white shadow-xl relative`}
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

  return <LearningScreen initialSyllabus={finalSyllabus} />;
}
