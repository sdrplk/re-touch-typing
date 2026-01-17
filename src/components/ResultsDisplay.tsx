"use client";

import { motion } from "motion/react";
import type { SessionResult } from "~/lib/types";

interface ResultsDisplayProps {
  result: SessionResult & { aiInsights?: string };
  onNewChallenge: () => void;
  isAnalyzing?: boolean;
}

export function ResultsDisplay({
  result,
  onNewChallenge,
  isAnalyzing,
}: ResultsDisplayProps) {
  if (isAnalyzing) {
    return (
      <div className="py-8 text-center font-mono">
        <motion.div
          className="text-cyan-400 text-lg"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          analyzing...
        </motion.div>
      </div>
    );
  }

  const getWpmColor = (wpm: number) => {
    if (wpm >= 80) return "text-emerald-400";
    if (wpm >= 50) return "text-cyan-400";
    return "text-white";
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 95) return "text-emerald-400";
    if (acc >= 85) return "text-cyan-400";
    return "text-white";
  };

  return (
    <div className="w-full font-mono">
      {/* Main Stats */}
      <div className="mb-8 grid grid-cols-4 gap-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            className={`text-4xl font-bold ${getWpmColor(result.wpm)}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            {result.wpm}
          </motion.div>
          <div className="text-xs text-zinc-500 mt-1">wpm</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className={`text-4xl font-bold ${getAccuracyColor(result.accuracy)}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            {result.accuracy}
            <span className="text-xl text-zinc-500">%</span>
          </motion.div>
          <div className="text-xs text-zinc-500 mt-1">accuracy</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="text-4xl font-bold text-zinc-300"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            {result.timeElapsed}
            <span className="text-xl text-zinc-500">s</span>
          </motion.div>
          <div className="text-xs text-zinc-500 mt-1">time</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="text-4xl font-bold text-zinc-300"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            {result.completedWords}
            <span className="text-xl text-zinc-500">/{result.totalWords}</span>
          </motion.div>
          <div className="text-xs text-zinc-500 mt-1">words</div>
        </motion.div>
      </div>

      {/* Struggling Keys */}
      {result.strugglingKeys.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <div className="mb-2 text-xs text-zinc-500">practice these:</div>
          <div className="flex flex-wrap gap-2">
            {result.strugglingKeys.map((key, i) => (
              <motion.span
                key={key.key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="text-base px-3 py-1 bg-zinc-900 border border-zinc-800 rounded"
              >
                <span className="text-cyan-400 font-bold">{key.key.toUpperCase()}</span>
                <span className="text-zinc-500 text-sm ml-1">×{key.errorCount}</span>
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Insights */}
      {result.aiInsights && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8 text-sm text-zinc-400 border-l-2 border-zinc-800 pl-4"
        >
          {result.aiInsights}
        </motion.div>
      )}

      {/* New Challenge Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.02, backgroundColor: "rgba(34, 211, 238, 0.1)" }}
        whileTap={{ scale: 0.98 }}
        onClick={onNewChallenge}
        className="w-full border border-zinc-700 py-4 text-base text-white hover:border-cyan-800 transition-colors rounded"
      >
        start new test
      </motion.button>
    </div>
  );
}
