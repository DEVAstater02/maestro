"use client";

import { motion } from "framer-motion";

interface CodeSnippetProps {
  data: {
    language: string;
    filename: string;
    code: string;
  };
}

export default function CodeSnippet({ data }: CodeSnippetProps) {
  const lines = data.code.split("\n");

  return (
    <div className="w-full h-full flex items-center justify-center p-6 sm:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl"
      >
        <div className="maestro-stage px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="absolute inset-x-[14%] top-[8%] h-36 rounded-full blur-[88px] maestro-aura-breathe"
            style={{ background: "radial-gradient(circle, rgba(0,230,118,0.18) 0%, transparent 72%)" }}
          />

          <div className="relative z-10 flex flex-col gap-5">
            <motion.p
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.44 }}
              className="maestro-breadcrumb"
            >
              CODE / {data.language.toUpperCase()} / {data.filename.toUpperCase()}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.16, duration: 0.56 }}
              className="maestro-projection-panel relative overflow-hidden rounded-[26px]"
            >
              <div className="maestro-scanlines absolute inset-0 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between border-b border-white/8 px-5 py-3">
                <p className="maestro-breadcrumb">PROJECTED SNIPPET</p>
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/8" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/8" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/8" />
                </div>
              </div>

              <div className="relative z-10 overflow-x-auto px-5 py-5">
                <pre className="font-mono text-[13px] leading-[1.85] text-white/86">
                  <code>
                    {lines.map((line, index) => (
                      <motion.div
                        key={`${index}-${line}`}
                        initial={{ opacity: 0, scale: 0.98, x: -8 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.02, duration: 0.32 }}
                        className="flex"
                      >
                        <span className="mr-4 inline-block w-8 select-none text-right text-xs text-white/20">
                          {index + 1}
                        </span>
                        <span className="flex-1 whitespace-pre">{line || " "}</span>
                      </motion.div>
                    ))}
                  </code>
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
