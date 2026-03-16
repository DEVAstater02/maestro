"use client";

import { motion } from "framer-motion";

interface DataPointProps {
  data: {
    label: string;
    value: string;
    comparison?: {
      label: string;
      value: string;
    };
  };
}

export default function DataPoint({ data }: DataPointProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4 text-center"
      >
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="maestro-breadcrumb"
        >
          {data.label.toUpperCase()}
        </motion.p>

        {/* Hero Value */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Glow behind value */}
          <div
            className="absolute inset-0 blur-[40px] opacity-30"
            style={{ background: "radial-gradient(circle, #00E676 0%, transparent 70%)" }}
          />
          <p className="relative text-6xl sm:text-7xl md:text-8xl font-bold text-maestro-green tracking-tight">
            {data.value}
          </p>
        </motion.div>

        {/* Comparison */}
        {data.comparison && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 mt-2"
          >
            <span className="maestro-breadcrumb">{data.comparison.label}:</span>
            <span className="text-sm font-mono text-white/60">{data.comparison.value}</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
