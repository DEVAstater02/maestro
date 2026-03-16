"use client";

import { motion } from "framer-motion";

interface ProcessStep {
  label: string;
  description?: string;
}

interface SteppedProcessProps {
  data: {
    title: string;
    steps: ProcessStep[];
    current_step_index: number;
  };
}

export default function SteppedProcess({ data }: SteppedProcessProps) {
  const { steps, current_step_index } = data;

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        {/* Title */}
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="maestro-breadcrumb text-center mb-10"
        >
          PROCESS / {data.title.toUpperCase()}
        </motion.p>

        {/* Steps */}
        <div className="flex flex-col items-center gap-0">
          {steps.map((step, i) => {
            const isActive = i === current_step_index;
            const isPast = i < current_step_index;

            return (
              <div key={i} className="flex flex-col items-center">
                {/* Connecting line (before node, except first) */}
                {i > 0 && (
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.15 * i, duration: 0.3 }}
                    className="w-px h-8 origin-top"
                    style={{
                      background: isPast || isActive
                        ? "rgba(0, 230, 118, 0.4)"
                        : "rgba(255, 255, 255, 0.12)",
                    }}
                  />
                )}

                {/* Node */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + 0.12 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex flex-col items-center"
                >
                  {/* Active halo */}
                  {isActive && (
                    <motion.div
                      className="absolute -inset-3 rounded-xl"
                      animate={{
                        boxShadow: [
                          "0 0 20px 4px rgba(0,230,118,0.15)",
                          "0 0 30px 8px rgba(0,230,118,0.25)",
                          "0 0 20px 4px rgba(0,230,118,0.15)",
                        ],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}

                  <div
                    className={`relative px-6 py-3 rounded-xl border transition-all duration-300 ${
                      isActive
                        ? "border-maestro-green/60 bg-maestro-green/10 shadow-[0_0_20px_rgba(0,230,118,0.12)]"
                        : isPast
                          ? "border-white/15 bg-white/5"
                          : "border-white/8 bg-transparent"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        isActive
                          ? "text-maestro-green"
                          : isPast
                            ? "text-white/60"
                            : "text-white/30"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.description && isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs text-white/50 mt-1 max-w-xs"
                      >
                        {step.description}
                      </motion.p>
                    )}
                  </div>

                  {/* Step number */}
                  <span
                    className={`absolute -left-8 top-1/2 -translate-y-1/2 text-[10px] font-mono ${
                      isActive ? "text-maestro-green" : "text-white/20"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
