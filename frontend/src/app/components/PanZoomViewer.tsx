"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PanZoomViewerProps {
  svgHtml: string;
  diagramId: string; // forces re-mount on diagram change
}

const ZoomInIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.15;

export default function PanZoomViewer({ svgHtml, diagramId }: PanZoomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(0.9);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  // Reset on diagram change
  useEffect(() => {
    setScale(0.9);
    setTranslate({ x: 0, y: 0 });
  }, [diagramId]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  }, []);

  // Pan: pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [translate]);

  // Pan: pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTranslate({
      x: translateStart.current.x + dx,
      y: translateStart.current.y + dy,
    });
  }, []);

  // Pan: pointer up
  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP * 2));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP * 2));
  const resetView = () => { setScale(0.9); setTranslate({ x: 0, y: 0 }); };

  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="w-full h-full relative select-none" style={{ touchAction: "none" }}>
      {/* Pannable / zoomable canvas */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={contentRef}
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isPanning.current ? "none" : "transform 0.15s ease-out",
          }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>

      {/* Zoom controls — bottom right */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white border border-[var(--color-border)] rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-surface-alt)] transition-colors"
          title="Zoom out"
        >
          <ZoomOutIcon />
        </button>
        <span className="text-[10px] text-[var(--color-text-muted)] w-10 text-center font-medium tabular-nums">
          {zoomPercent}%
        </span>
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-surface-alt)] transition-colors"
          title="Zoom in"
        >
          <ZoomInIcon />
        </button>
        <div className="w-px h-4 bg-[var(--color-border)]" />
        <button
          onClick={resetView}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-surface-alt)] transition-colors"
          title="Reset view"
        >
          <ResetIcon />
        </button>
      </div>
    </div>
  );
}
