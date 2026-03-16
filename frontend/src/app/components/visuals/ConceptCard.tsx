"use client";

import { motion } from "framer-motion";

interface MetadataField {
  label: string;
  value: string;
}

interface ConceptCardProps {
  data: {
    title: string;
    definition: string;
    metadata?: MetadataField[];
  };
}

export default function ConceptCard({ data }: ConceptCardProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-md w-full"
      >
        {/* Card */}
        <div className="maestro-card rounded-2xl p-8 flex flex-col items-center gap-6 text-center">
          {/* Title breadcrumb */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="maestro-breadcrumb"
          >
            CONCEPT
          </motion.p>

          {/* Pulsing Orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
            className="relative"
          >
            <div className="maestro-orb w-12 h-12 rounded-full" />
            <div className="maestro-orb-pulse absolute inset-0 w-12 h-12 rounded-full" />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg font-semibold tracking-tight text-white"
          >
            {data.title}
          </motion.h2>

          {/* Definition */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="font-mono text-sm text-white/80 leading-relaxed max-w-sm"
          >
            {data.definition}
          </motion.p>

          {/* Metadata */}
          {data.metadata && data.metadata.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 justify-center pt-2 border-t border-white/10 w-full"
            >
              {data.metadata.map((m, i) => (
                <span key={i} className="maestro-breadcrumb">
                  {m.label}: <span className="text-maestro-green">{m.value}</span>
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
