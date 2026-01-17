"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Challenge, SessionResult } from "~/lib/types";

interface ChallengeHistoryProps {
  challenges: Challenge[];
}

function CompactChallengeCard({
  challenge,
  index,
  totalCount,
}: {
  challenge: Challenge;
  index: number;
  totalCount: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const result = challenge.result as SessionResult & { aiInsights?: string };

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="mb-2 border-b border-zinc-800/50 pb-2"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left font-mono text-sm hover:text-cyan-400 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-zinc-700">#{totalCount - index}</span>
          <span className="text-white font-medium">{result.wpm}</span>
          <span className="text-zinc-600">wpm</span>
          <span className="text-zinc-500">{result.accuracy}%</span>
        </div>
        <motion.span
          className="text-zinc-600"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ↓
        </motion.span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 text-xs text-zinc-500 space-y-2">
              <div className="line-clamp-2 text-zinc-600">{challenge.text}</div>
              <div className="flex gap-4">
                <span>{result.timeElapsed}s</span>
                <span>{result.completedWords}/{result.totalWords} words</span>
                <span>{result.totalKeystrokes} keys</span>
              </div>
              {result.strugglingKeys.length > 0 && (
                <div>
                  practice:{" "}
                  <span className="text-cyan-400">
                    {result.strugglingKeys.slice(0, 3).map((k) => k.key.toUpperCase()).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ChallengeHistory({ challenges }: ChallengeHistoryProps) {
  if (challenges.length === 0) return null;

  const completedChallenges = challenges.filter((c) => c.result !== null);

  if (completedChallenges.length === 0) return null;

  return (
    <div className="mb-6 w-full font-mono">
      <div className="mb-3 text-xs text-zinc-600 flex items-center gap-2">
        <span>history</span>
        <span className="text-cyan-400">{completedChallenges.length}</span>
      </div>

      <div className="max-h-40 overflow-y-auto">
        {completedChallenges.map((challenge, index) => (
          <CompactChallengeCard
            key={challenge.id}
            challenge={challenge}
            index={index}
            totalCount={completedChallenges.length}
          />
        ))}
      </div>
    </div>
  );
}
