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
  // Split code into lines for line-number display
  const lines = data.code.split("\n");

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl w-full"
      >
        {/* Code editor card */}
        <div className="maestro-card rounded-2xl overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="maestro-breadcrumb"
            >
              CODE / {data.language.toUpperCase()} / {data.filename.toUpperCase()}
            </motion.p>

            {/* Fake window dots */}
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            </div>
          </div>

          {/* Code body */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="p-5 overflow-x-auto"
          >
            <pre className="text-[13px] leading-[1.8] font-mono text-white/85">
              <code>
                {lines.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="inline-block w-8 text-right mr-4 text-white/20 select-none text-xs">
                      {i + 1}
                    </span>
                    <span className="flex-1 whitespace-pre">{line}</span>
                  </div>
                ))}
              </code>
            </pre>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
