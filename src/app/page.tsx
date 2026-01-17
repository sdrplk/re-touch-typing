"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BotDetection } from "~/components/BotDetection";
import { ChallengeHistory } from "~/components/ChallengeHistory";
import { ResultsDisplay } from "~/components/ResultsDisplay";
import { TypingInterface } from "~/components/TypingInterface";
import type { Challenge, Keystroke, SessionResult } from "~/lib/types";

type SessionState = "loading" | "ready" | "typing" | "analyzing" | "results";

interface PerformanceData {
  strugglingKeys: { key: string; errorCount: number }[];
  accuracy: number;
  wpm: number;
  recentErrors: string[];
}

interface PreloadedText {
  text: string;
  isPersonalized: boolean;
  targetKeys: string[];
}

export default function Home() {
  const [isVerified, setIsVerified] = useState(false);
  const [isBotDetected, setIsBotDetected] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [currentText, setCurrentText] = useState("");
  const [currentKeystrokes, setCurrentKeystrokes] = useState<Keystroke[]>([]);
  const [currentResult, setCurrentResult] = useState<
    (SessionResult & { aiInsights?: string }) | null
  >(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  
  // Preloaded next text for instant start
  const preloadedTextRef = useRef<PreloadedText | null>(null);
  const isPreloadingRef = useRef(false);

  // Aggregate performance data from all previous sessions
  const aggregatedPerformance = useMemo((): PerformanceData | null => {
    if (challenges.length === 0) return null;

    const keyErrorMap: Record<string, number> = {};
    const recentErrors: string[] = [];
    let totalAccuracy = 0;
    let totalWpm = 0;
    let sessionCount = 0;

    for (const challenge of challenges) {
      if (!challenge.result) continue;
      sessionCount++;
      totalAccuracy += challenge.result.accuracy;
      totalWpm += challenge.result.wpm;

      for (const sk of challenge.result.strugglingKeys) {
        keyErrorMap[sk.key] = (keyErrorMap[sk.key] || 0) + sk.errorCount;
      }

      for (const ks of challenge.keystrokes) {
        if (!ks.isCorrect && ks.expected && ks.key !== "Backspace") {
          recentErrors.push(ks.expected);
        }
      }
    }

    if (sessionCount === 0) return null;

    const strugglingKeys = Object.entries(keyErrorMap)
      .map(([key, errorCount]) => ({ key, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 8);

    return {
      strugglingKeys,
      accuracy: Math.round(totalAccuracy / sessionCount),
      wpm: Math.round(totalWpm / sessionCount),
      recentErrors: recentErrors.slice(-50),
    };
  }, [challenges]);

  // Fetch text from API
  const fetchText = useCallback(async (performanceData: PerformanceData | null): Promise<PreloadedText> => {
    try {
      let res: Response;

      if (performanceData && performanceData.strugglingKeys.length > 0) {
        res = await fetch("/api/generate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ performanceData }),
        });
      } else {
        res = await fetch("/api/generate-text");
      }

      if (!res.ok) throw new Error("Failed to generate text");
      const data = await res.json();
      return {
        text: data.text,
        isPersonalized: data.isPersonalized || false,
        targetKeys: data.targetKeys || [],
      };
    } catch (err) {
      console.error("Error fetching text:", err);
      return {
        text: "the quick brown fox jumps over the lazy dog and runs into the forest where animals live in peace under tall trees that give shade from the hot sun while birds sing their songs high above in branches where they build nests to raise young ones who will soon fly and explore the world",
        isPersonalized: false,
        targetKeys: [],
      };
    }
  }, []);

  // Preload next text in background
  const preloadNextText = useCallback(async (performanceData: PerformanceData | null) => {
    if (isPreloadingRef.current) return;
    isPreloadingRef.current = true;
    
    try {
      const preloaded = await fetchText(performanceData);
      preloadedTextRef.current = preloaded;
    } finally {
      isPreloadingRef.current = false;
    }
  }, [fetchText]);

  // Load challenge - uses preloaded text if available
  const loadNewChallenge = useCallback(async () => {
    setError(null);
    setCurrentResult(null);
    setCurrentKeystrokes([]);

    // Use preloaded text if available for instant start
    if (preloadedTextRef.current) {
      const preloaded = preloadedTextRef.current;
      preloadedTextRef.current = null;
      setCurrentText(preloaded.text);
      setIsPersonalized(preloaded.isPersonalized);
      setTargetKeys(preloaded.targetKeys);
      setSessionState("ready");
      return;
    }

    // Otherwise fetch new text
    setSessionState("loading");
    const data = await fetchText(aggregatedPerformance);
    setCurrentText(data.text);
    setIsPersonalized(data.isPersonalized);
    setTargetKeys(data.targetKeys);
    setSessionState("ready");
  }, [aggregatedPerformance, fetchText]);

  // Initial load after verification
  useEffect(() => {
    if (isVerified && sessionState === "loading") {
      loadNewChallenge();
    }
  }, [isVerified, sessionState, loadNewChallenge]);

  // Handle session completion
  const handleComplete = useCallback(
    async (keystrokes: Keystroke[], timeElapsed: number, completedWords: number) => {
      setSessionState("analyzing");
      setCurrentKeystrokes(keystrokes);

      const words = currentText.split(" ");

      // Start preloading next text immediately in background
      // We need to calculate the new performance data first
      const currentKeyErrors: Record<string, number> = {};
      for (const ks of keystrokes) {
        if (!ks.isCorrect && ks.expected && ks.key !== "Backspace") {
          const key = ks.expected.toLowerCase();
          currentKeyErrors[key] = (currentKeyErrors[key] || 0) + 1;
        }
      }

      try {
        const res = await fetch("/api/analyze-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keystrokes,
            text: currentText,
            timeElapsed,
            completedWords,
            totalWords: words.length,
          }),
        });

        if (!res.ok) throw new Error("Analysis failed");
        const result = await res.json();
        setCurrentResult(result);

        const newChallenge: Challenge = {
          id: Date.now().toString(),
          text: currentText,
          keystrokes,
          result,
          startTime: Date.now() - timeElapsed * 1000,
          endTime: Date.now(),
        };
        setChallenges((prev) => {
          const updated = [newChallenge, ...prev];
          // Preload next text with updated performance data
          const keyErrorMap: Record<string, number> = {};
          for (const challenge of updated) {
            if (!challenge.result) continue;
            for (const sk of challenge.result.strugglingKeys) {
              keyErrorMap[sk.key] = (keyErrorMap[sk.key] || 0) + sk.errorCount;
            }
          }
          const strugglingKeys = Object.entries(keyErrorMap)
            .map(([key, errorCount]) => ({ key, errorCount }))
            .sort((a, b) => b.errorCount - a.errorCount)
            .slice(0, 8);
          
          if (strugglingKeys.length > 0) {
            preloadNextText({
              strugglingKeys,
              accuracy: result.accuracy,
              wpm: result.wpm,
              recentErrors: [],
            });
          } else {
            preloadNextText(null);
          }
          
          return updated;
        });
        setSessionState("results");
      } catch (err) {
        console.error("Analysis error:", err);
        const totalKeystrokes = keystrokes.length;
        const correctKeystrokes = keystrokes.filter((k) => k.isCorrect).length;
        const accuracy =
          totalKeystrokes > 0
            ? Math.round((correctKeystrokes / totalKeystrokes) * 100)
            : 0;
        const timeInMinutes = timeElapsed / 60;
        const charactersTyped = keystrokes.filter(
          (k) => k.key !== "Backspace"
        ).length;
        const wpm =
          timeInMinutes > 0 ? Math.round(charactersTyped / 5 / timeInMinutes) : 0;

        const strugglingKeys = Object.entries(currentKeyErrors)
          .map(([key, errorCount]) => ({ key, errorCount, avgDelay: 0 }))
          .sort((a, b) => b.errorCount - a.errorCount)
          .slice(0, 5);

        const fallbackResult: SessionResult & { aiInsights?: string } = {
          wpm,
          accuracy,
          strugglingKeys,
          totalKeystrokes,
          correctKeystrokes,
          timeElapsed,
          completedWords,
          totalWords: words.length,
          aiInsights: "Keep practicing to improve your typing speed!",
        };

        setCurrentResult(fallbackResult);

        const newChallenge: Challenge = {
          id: Date.now().toString(),
          text: currentText,
          keystrokes,
          result: fallbackResult,
          startTime: Date.now() - timeElapsed * 1000,
          endTime: Date.now(),
        };
        setChallenges((prev) => {
          const updated = [newChallenge, ...prev];
          // Preload next text
          if (strugglingKeys.length > 0) {
            preloadNextText({
              strugglingKeys: strugglingKeys.map(k => ({ key: k.key, errorCount: k.errorCount })),
              accuracy,
              wpm,
              recentErrors: [],
            });
          } else {
            preloadNextText(null);
          }
          return updated;
        });
        setSessionState("results");
      }
    },
    [currentText, preloadNextText]
  );

  const handleNewChallenge = useCallback(() => {
    loadNewChallenge();
  }, [loadNewChallenge]);

  const handleVerified = useCallback(() => {
    setIsVerified(true);
  }, []);

  const handleBotDetected = useCallback(() => {
    setIsBotDetected(true);
  }, []);

  return (
    <>
      {!isVerified && !isBotDetected && (
        <BotDetection onVerified={handleVerified} onBotDetected={handleBotDetected} />
      )}

      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center"
          >
            <h1 className="font-mono text-2xl font-bold">
              touch<span className="text-cyan-400">type</span>
            </h1>
          </motion.header>

          {/* Challenge History */}
          {challenges.length > 0 && sessionState !== "results" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <ChallengeHistory challenges={challenges} />
            </motion.div>
          )}

          {/* Personalized indicator */}
          {isPersonalized && (sessionState === "ready" || sessionState === "typing") && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 font-mono text-sm text-zinc-500"
            >
              <span className="text-cyan-400">●</span> personalized • focus:{" "}
              <span className="text-white">
                {targetKeys.slice(0, 3).map(k => k.toUpperCase()).join(", ")}
              </span>
              {targetKeys.length > 3 && <span className="text-zinc-600"> +{targetKeys.length - 3}</span>}
            </motion.div>
          )}

          {/* Loading State */}
          {sessionState === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center font-mono"
            >
              <motion.span
                className="text-cyan-400"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                loading...
              </motion.span>
            </motion.div>
          )}

          {/* Ready/Typing State */}
          {(sessionState === "ready" || sessionState === "typing") && (
            <TypingInterface
              text={currentText}
              onComplete={handleComplete}
              isActive={sessionState === "ready" || sessionState === "typing"}
            />
          )}

          {/* Analyzing State */}
          {sessionState === "analyzing" && (
            <div className="w-full">
              <div className="mb-6 font-mono text-sm text-zinc-600 line-clamp-3">
                {currentText}
              </div>
              <ResultsDisplay
                result={{
                  wpm: 0,
                  accuracy: 0,
                  strugglingKeys: [],
                  totalKeystrokes: 0,
                  correctKeystrokes: 0,
                  timeElapsed: 0,
                  completedWords: 0,
                  totalWords: 0,
                }}
                onNewChallenge={handleNewChallenge}
                isAnalyzing
              />
            </div>
          )}

          {/* Results State */}
          {sessionState === "results" && currentResult && (
            <div className="w-full">
              <div className="mb-6 font-mono text-sm text-zinc-600 line-clamp-2">
                {currentText}
              </div>
              <ResultsDisplay
                result={currentResult}
                onNewChallenge={handleNewChallenge}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 font-mono text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center font-mono text-xs text-zinc-600"
          >
            <span className="text-zinc-500">space</span> to start • <span className="text-zinc-500">60s</span>
          </motion.footer>
        </div>
      </div>
    </>
  );
}
