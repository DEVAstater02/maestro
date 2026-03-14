"use client";

import { useRef, useEffect } from "react";

interface VoiceOrbProps {
  analyserNode: AnalyserNode | null;
  state: "idle" | "speaking" | "recording" | "processing";
  size?: number;
}

export default function VoiceOrb({ analyserNode, state, size = 340 }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const smoothAmplitudeRef = useRef(0);

  // Keep latest props accessible inside the stable draw loop without re-creating it
  const analyserRef = useRef(analyserNode);
  const stateRef = useRef(state);
  useEffect(() => { analyserRef.current = analyserNode; }, [analyserNode]);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const w = size;
      const h = size;
      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = w * 0.36;
      const scaleFactor = size / 340; // scale deformations for small sizes
      const currentState = stateRef.current;
      const analyser = analyserRef.current;

      // ── Amplitude from Web Audio ──
      let rawAmplitude = 0;
      let frequencies: Uint8Array | null = null;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        frequencies = data;
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        rawAmplitude = sum / (data.length * 255);
      }

      // Gentle ambient pulse when idle / no audio
      const target =
        currentState === "idle" || currentState === "processing"
          ? Math.max(rawAmplitude, 0.025 + Math.sin(phaseRef.current * 0.4) * 0.012)
          : rawAmplitude;

      // Low-pass smooth
      smoothAmplitudeRef.current += (target - smoothAmplitudeRef.current) * 0.12;
      const amp = smoothAmplitudeRef.current;

      ctx.clearRect(0, 0, w, h);

      // ── Outer ambient glow — circular arc, never a rectangle ──
      // Cap glow radius to canvas bounds so the gradient fully fades before the edge
      const glowR = Math.min(baseRadius * (2.0 + amp * 0.7), Math.min(cx, cy) - 2);
      const glowAlpha =
        currentState === "speaking"  ? 0.45 + amp * 0.5 :
        currentState === "recording" ? 0.32 + amp * 0.4 : 0.12;
      const glowGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, glowR);
      glowGrad.addColorStop(0,    `rgba(50, 220, 160, ${glowAlpha})`);
      glowGrad.addColorStop(0.45, `rgba(10, 160, 100, ${glowAlpha * 0.35})`);
      glowGrad.addColorStop(0.75, `rgba(0,   90,  60, ${glowAlpha * 0.1})`);
      glowGrad.addColorStop(1,    `rgba(0,   40,  25, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // ── Build deformed-circle orb path ──
      const N = 120;
      const deform = (
        currentState === "speaking"  ? 9  + amp * 22 :
        currentState === "recording" ? 6  + amp * 14 : 2.5
      ) * scaleFactor;

      const pts: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        let d = 0;
        if (frequencies) {
          const fi = Math.floor((i / N) * Math.min(frequencies.length, 80));
          d += (frequencies[fi] / 255) * deform * 0.65;
        }
        d += Math.sin(a * 3 + phaseRef.current * 0.70) * deform * 0.32;
        d += Math.sin(a * 5 - phaseRef.current * 1.10) * deform * 0.18;
        d += Math.sin(a * 2 + phaseRef.current * 0.30) * deform * 0.22;
        const r = baseRadius + d;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i][0] + pts[i + 1][0]) / 2;
        const yc = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
      }
      ctx.closePath();

      // ── Sphere gradient fill ──
      const lx = cx - baseRadius * 0.22;
      const ly = cy - baseRadius * 0.28;
      const b = amp * 0.22;
      const grad = ctx.createRadialGradient(lx, ly, 0, cx, cy, baseRadius * 1.15);
      grad.addColorStop(0,    `rgba(${210 + b * 10}, 255,             ${240 + b * 5}, 1)`);
      grad.addColorStop(0.22, `rgba(${60  + b * 8},  ${220 + b * 10}, ${170 + b * 5}, 1)`);
      grad.addColorStop(0.48, `rgba(${10  + b * 5},  ${155 + b * 8},  ${100 + b * 4}, 1)`);
      grad.addColorStop(0.72, `rgba(0,               ${75  + b * 5},  ${50  + b * 3}, 1)`);
      grad.addColorStop(1,    `rgba(0,               15,              10,             1)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // ── Interior layers (clipped to orb shape) ──
      ctx.save();
      ctx.clip();

      // Specular highlight — top-left
      const specG = ctx.createRadialGradient(
        lx - baseRadius * 0.04, ly - baseRadius * 0.04, 0,
        lx + baseRadius * 0.18, ly + baseRadius * 0.18, baseRadius * 0.6
      );
      specG.addColorStop(0,    "rgba(255,255,255,0.52)");
      specG.addColorStop(0.28, "rgba(255,255,255,0.18)");
      specG.addColorStop(0.65, "rgba(255,255,255,0.04)");
      specG.addColorStop(1,    "rgba(255,255,255,0)");
      ctx.fillStyle = specG;
      ctx.fillRect(0, 0, w, h);

      // Bottom shadow for depth
      const shadowG = ctx.createRadialGradient(
        cx, cy + baseRadius * 0.32, 0,
        cx, cy + baseRadius * 0.08, baseRadius * 0.95
      );
      shadowG.addColorStop(0,   "rgba(0,0,0,0.42)");
      shadowG.addColorStop(0.4, "rgba(0,0,0,0.12)");
      shadowG.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = shadowG;
      ctx.fillRect(0, 0, w, h);

      // Orbiting inner shimmer
      const sa = phaseRef.current * 0.22;
      const sx = cx + Math.cos(sa) * baseRadius * 0.18;
      const sy = cy + Math.sin(sa) * baseRadius * 0.18;
      const shimG = ctx.createRadialGradient(sx, sy, 0, sx, sy, baseRadius * 0.42);
      shimG.addColorStop(0, `rgba(255,255,255,${0.05 + amp * 0.09})`);
      shimG.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = shimG;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();

      // ── Edge stroke ──
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i][0] + pts[i + 1][0]) / 2;
        const yc = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(150,255,210,${0.22 + amp * 0.18})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Phase advance ──
      phaseRef.current +=
        currentState === "speaking"  ? 0.052 :
        currentState === "recording" ? 0.038 : 0.011;

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [size]); // stable loop — reads state/analyser via refs

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
