"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface DecisionNode {
  label: string;
  context?: string;
}

interface DecisionOption {
  id: string;
  label: string;
  description?: string;
}

interface DecisionPathProps {
  data: {
    current_node: DecisionNode;
    options: DecisionOption[];
    active_option_id?: string;
  };
}

interface OptionLayout {
  x: number;
  y: number;
  scale: number;
}

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 620;
const CURRENT_NODE_X = VIEWBOX_WIDTH / 2;
const CURRENT_NODE_Y = 190;

function getOptionLayout(index: number, count: number): OptionLayout {
  const presets: Record<number, OptionLayout[]> = {
    2: [
      { x: 320, y: 470, scale: 0.9 },
      { x: 680, y: 470, scale: 0.9 },
    ],
    3: [
      { x: 250, y: 488, scale: 0.88 },
      { x: 500, y: 446, scale: 0.84 },
      { x: 750, y: 488, scale: 0.88 },
    ],
    4: [
      { x: 190, y: 500, scale: 0.86 },
      { x: 395, y: 452, scale: 0.84 },
      { x: 605, y: 452, scale: 0.84 },
      { x: 810, y: 500, scale: 0.86 },
    ],
  };

  const layout = presets[count]?.[index];
  if (layout) return layout;

  const progress = count <= 1 ? 0.5 : index / Math.max(1, count - 1);
  return {
    x: 180 + progress * 640,
    y: 480 - Math.cos(progress * Math.PI) * 18,
    scale: 0.88,
  };
}

function buildPath(target: OptionLayout) {
  const midY = (CURRENT_NODE_Y + target.y) / 2;
  const curve = Math.abs(target.x - CURRENT_NODE_X) * 0.22;

  return [
    `M ${CURRENT_NODE_X} ${CURRENT_NODE_Y + 52}`,
    `C ${CURRENT_NODE_X} ${(midY + 20).toFixed(1)},`,
    `${(target.x + (target.x > CURRENT_NODE_X ? -curve : curve)).toFixed(1)} ${(midY + 56).toFixed(1)},`,
    `${target.x} ${(target.y - 52).toFixed(1)}`,
  ].join(" ");
}

export default function DecisionPath({ data }: DecisionPathProps) {
  const options = data.options.slice(0, 4);
  const initialActiveId = data.active_option_id ?? options[0]?.id ?? "";
  const [activeOptionId, setActiveOptionId] = useState(initialActiveId);

  return (
    <div className="w-full h-full flex items-center justify-center p-6 sm:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl"
      >
        <div className="maestro-stage min-h-[620px] px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="absolute inset-x-[20%] top-[12%] h-40 rounded-full blur-[88px] maestro-aura-breathe"
            style={{ background: "radial-gradient(circle, rgba(0,230,118,0.20) 0%, transparent 72%)" }}
          />

          <div className="relative z-10 flex flex-col gap-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.45 }}
              className="flex items-center justify-between gap-4"
            >
              <p className="maestro-breadcrumb">DECISION PATH</p>
              <p className="maestro-breadcrumb">OPTIONS / {options.length}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.18, duration: 0.58 }}
              className="maestro-projection-panel relative overflow-hidden rounded-[26px] min-h-[520px] px-4 py-4 sm:px-6"
            >
              <div className="maestro-scanlines absolute inset-0 pointer-events-none" />

              <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="absolute inset-0 z-0 w-full h-full">
                <defs>
                  <filter id="decision-glow">
                    <feGaussianBlur stdDeviation="6" result="blurred" />
                    <feMerge>
                      <feMergeNode in="blurred" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {options.map((option, index) => {
                  const layout = getOptionLayout(index, options.length);
                  const isActive = option.id === activeOptionId;
                  const path = buildPath(layout);

                  return (
                    <motion.g
                      key={option.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.22 + index * 0.08, duration: 0.42 }}
                    >
                      <motion.path
                        d={path}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: 1,
                          opacity: isActive ? [0.24, 0.48, 0.24] : 0.1,
                        }}
                        transition={{
                          pathLength: { delay: 0.26 + index * 0.08, duration: 0.62, ease: "easeOut" },
                          opacity: {
                            duration: isActive ? 2.6 : 0.24,
                            repeat: isActive ? Infinity : 0,
                            ease: "easeInOut",
                          },
                        }}
                        stroke={isActive ? "rgba(0,230,118,0.26)" : "rgba(255,255,255,0.08)"}
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        filter="url(#decision-glow)"
                      />
                      <motion.path
                        d={path}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: 1,
                          opacity: isActive ? 0.9 : 0.28,
                        }}
                        transition={{
                          pathLength: { delay: 0.24 + index * 0.08, duration: 0.68, ease: "easeOut" },
                          opacity: { duration: 0.22 },
                        }}
                        stroke={isActive ? "rgba(157,255,204,0.92)" : "rgba(255,255,255,0.22)"}
                        strokeWidth={isActive ? "2.2" : "1.4"}
                        strokeDasharray={isActive ? "8 10" : "4 12"}
                        fill="none"
                        strokeLinecap="round"
                      />
                    </motion.g>
                  );
                })}
              </svg>

              <div className="relative z-10 min-h-[488px]">
                <div className="absolute left-1/2 top-[16%] w-[min(520px,80%)] -translate-x-1/2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.52 }}
                    className="rounded-[26px] border border-white/8 bg-black/42 px-6 py-6 text-center shadow-[0_0_50px_rgba(0,230,118,0.09)] backdrop-blur-md"
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(0,230,118,0.12)",
                          "0 0 26px 6px rgba(0,230,118,0.18)",
                          "0 0 0 0 rgba(0,230,118,0.12)",
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-maestro-green/60 bg-maestro-green/10"
                    >
                      <div className="maestro-orb h-7 w-7 rounded-full" />
                    </motion.div>

                    <p className="maestro-breadcrumb mb-3">CURRENT NODE</p>
                    <h2 className="font-mono text-lg leading-snug text-white sm:text-xl">
                      {data.current_node.label}
                    </h2>
                    {data.current_node.context && (
                      <p className="mt-3 text-sm leading-relaxed text-white/52">
                        {data.current_node.context}
                      </p>
                    )}
                  </motion.div>
                </div>

                {options.map((option, index) => {
                  const layout = getOptionLayout(index, options.length);
                  const isActive = option.id === activeOptionId;

                  return (
                    <div
                      key={option.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${(layout.x / VIEWBOX_WIDTH) * 100}%`,
                        top: `${(layout.y / VIEWBOX_HEIGHT) * 100}%`,
                      }}
                    >
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.84, y: 12 }}
                        animate={{ opacity: 1, scale: isActive ? 1 : layout.scale, y: 0 }}
                        transition={{
                          delay: 0.3 + index * 0.08,
                          duration: 0.5,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        onMouseEnter={() => setActiveOptionId(option.id)}
                        onFocus={() => setActiveOptionId(option.id)}
                        className={`w-[180px] rounded-[22px] border px-5 py-4 text-left transition-all duration-200 focus:outline-none ${
                          isActive
                            ? "border-maestro-green/60 bg-black/72 shadow-[0_0_30px_rgba(0,230,118,0.14)]"
                            : "border-white/8 bg-black/44 hover:border-white/18"
                        }`}
                        style={{
                          filter: isActive ? "blur(0px)" : "blur(0.8px)",
                        }}
                      >
                        <p className={`maestro-breadcrumb mb-2 ${isActive ? "text-maestro-green" : ""}`}>
                          PATH {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className={`font-mono text-sm leading-snug ${isActive ? "text-white" : "text-white/72"}`}>
                          {option.label}
                        </p>
                        {option.description && (
                          <p className="mt-2 text-xs leading-relaxed text-white/45">{option.description}</p>
                        )}
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
