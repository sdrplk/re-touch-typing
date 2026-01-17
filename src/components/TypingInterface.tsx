"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Keystroke } from "~/lib/types";

interface TypingInterfaceProps {
  text: string;
  onComplete: (
    keystrokes: Keystroke[],
    timeElapsed: number,
    completedWords: number
  ) => void;
  isActive: boolean;
}

// Particle component for correct keystroke effect
function Particle({ x, y }: { x: number; y: number }) {
  const angle = Math.random() * Math.PI * 2;
  const velocity = 20 + Math.random() * 30;
  const endX = x + Math.cos(angle) * velocity;
  const endY = y + Math.sin(angle) * velocity;

  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-emerald-400"
      initial={{ x, y, opacity: 1, scale: 1 }}
      animate={{ x: endX, y: endY, opacity: 0, scale: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
  );
}

// Character component with animations
function AnimatedChar({
  char,
  isTyped,
  isCorrect,
  isCurrentChar,
  isCurrentWord,
  isPastWord,
  charIndex,
}: {
  char: string;
  isTyped: boolean;
  isCorrect: boolean | null;
  isCurrentChar: boolean;
  isCurrentWord: boolean;
  isPastWord: boolean;
  charIndex: number;
}) {
  const [showParticles, setShowParticles] = useState(false);
  const [particleKey, setParticleKey] = useState(0);
  const charRef = useRef<HTMLSpanElement>(null);

  // Trigger particles on correct keystroke
  useEffect(() => {
    if (isTyped && isCorrect) {
      setShowParticles(true);
      setParticleKey((k) => k + 1);
      const timer = setTimeout(() => setShowParticles(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isTyped, isCorrect]);

  let charClass = "text-zinc-600 transition-all duration-150";

  if (isTyped) {
    if (isCorrect) {
      charClass = "text-white";
    } else {
      charClass = "text-red-400";
    }
  } else if (isCurrentChar && isCurrentWord) {
    // Scanning effect - greenish blue glow on current char
    charClass = "text-cyan-400 animate-pulse";
  } else if (isCurrentWord) {
    charClass = "text-zinc-400";
  } else if (isPastWord) {
    charClass = "text-zinc-500";
  }

  return (
    <span className="relative inline-block">
      <motion.span
        ref={charRef}
        data-char={charIndex}
        className={charClass}
        initial={false}
        animate={
          isTyped && !isCorrect
            ? {
                x: [0, -2, 2, -2, 2, 0],
                color: "#f87171",
              }
            : isTyped && isCorrect
              ? { scale: [1, 1.2, 1], color: "#22c55e" }
              : {}
        }
        transition={
          isTyped && !isCorrect
            ? { duration: 0.3, ease: "easeInOut" }
            : { duration: 0.15 }
        }
        style={{
          textShadow: isCurrentChar && isCurrentWord 
            ? "0 0 8px rgba(34, 211, 238, 0.6), 0 0 16px rgba(34, 211, 238, 0.3)" 
            : isTyped && isCorrect 
              ? "0 0 4px rgba(34, 197, 94, 0.4)"
              : "none",
        }}
      >
        {char}
      </motion.span>

      {/* Particle explosion for correct keystrokes */}
      <AnimatePresence>
        {showParticles && (
          <div key={particleKey} className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <Particle key={i} x={6} y={8} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </span>
  );
}

export function TypingInterface({
  text,
  onComplete,
  isActive,
}: TypingInterfaceProps) {
  const words = useMemo(() => text.split(" "), [text]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [typedChars, setTypedChars] = useState<
    { char: string; isCorrect: boolean }[][]
  >([]);
  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [startTime, setStartTime] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const keystrokesRef = useRef<Keystroke[]>([]);
  const currentWordIndexRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => {
    keystrokesRef.current = keystrokes;
  }, [keystrokes]);

  useEffect(() => {
    currentWordIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  // Scroll current word into view
  useEffect(() => {
    if (!containerRef.current || !hasStarted) return;
    const wordElements = containerRef.current.querySelectorAll("[data-word]");
    const currentWordEl = wordElements[currentWordIndex] as HTMLElement;
    if (currentWordEl) {
      currentWordEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentWordIndex, hasStarted]);

  // Focus input on mount and when active
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  // Timer logic - only starts once when hasStarted becomes true
  useEffect(() => {
    if (!hasStarted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          onComplete(keystrokesRef.current, 60, currentWordIndexRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [hasStarted, onComplete]);

  // Handle completion when all words are typed
  useEffect(() => {
    if (hasStarted && currentWordIndex >= words.length) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 60;
      onComplete(keystrokesRef.current, elapsed, currentWordIndex);
    }
  }, [currentWordIndex, words.length, hasStarted, startTime, onComplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive || timeLeft === 0) return;

      const key = e.key;
      const timestamp = Date.now();

      // Start timer on first keystroke (space to start)
      if (!hasStarted) {
        if (key === " ") {
          e.preventDefault();
          setHasStarted(true);
          setStartTime(timestamp);
          return;
        }
        return;
      }

      // Prevent default for space to avoid scrolling
      if (key === " ") {
        e.preventDefault();
      }

      const currentWord = words[currentWordIndex];
      if (!currentWord && key !== "Backspace") return;

      // Initialize typed chars for current word if needed
      if (!typedChars[currentWordIndex]) {
        setTypedChars((prev) => {
          const next = [...prev];
          next[currentWordIndex] = [];
          return next;
        });
      }

      if (key === "Backspace") {
        const keystroke: Keystroke = {
          char: "",
          expected: "",
          timestamp,
          key: "Backspace",
          isCorrect: true,
          wordIndex: currentWordIndex,
          charIndex: currentCharIndex,
        };
        setKeystrokes((prev) => [...prev, keystroke]);

        if (currentCharIndex > 0) {
          // Delete character in current word
          setCurrentCharIndex((prev) => prev - 1);
          setTypedChars((prev) => {
            const next = [...prev];
            if (next[currentWordIndex]) {
              next[currentWordIndex] = next[currentWordIndex].slice(0, -1);
            }
            return next;
          });
        } else if (currentWordIndex > 0) {
          // Go back to previous word
          const prevWordIndex = currentWordIndex - 1;
          const prevWordTyped = typedChars[prevWordIndex] || [];
          setCurrentWordIndex(prevWordIndex);
          setCurrentCharIndex(prevWordTyped.length);
        }
      } else if (key === " ") {
        // Move to next word on space
        const currentTyped = typedChars[currentWordIndex] || [];
        if (currentTyped.length > 0) {
          const keystroke: Keystroke = {
            char: " ",
            expected: " ",
            timestamp,
            key: " ",
            isCorrect: true,
            wordIndex: currentWordIndex,
            charIndex: currentCharIndex,
          };
          setKeystrokes((prev) => [...prev, keystroke]);
          setCurrentWordIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        }
      } else if (key.length === 1 && currentWord) {
        // Regular character
        const expectedChar = currentWord[currentCharIndex] || "";
        const isCorrect = key === expectedChar;

        const keystroke: Keystroke = {
          char: key,
          expected: expectedChar,
          timestamp,
          key,
          isCorrect,
          wordIndex: currentWordIndex,
          charIndex: currentCharIndex,
        };
        setKeystrokes((prev) => [...prev, keystroke]);

        setTypedChars((prev) => {
          const next = [...prev];
          if (!next[currentWordIndex]) {
            next[currentWordIndex] = [];
          }
          next[currentWordIndex] = [
            ...next[currentWordIndex],
            { char: key, isCorrect },
          ];
          return next;
        });
        setCurrentCharIndex((prev) => prev + 1);
      }
    },
    [
      isActive,
      timeLeft,
      hasStarted,
      words,
      currentWordIndex,
      currentCharIndex,
      typedChars,
    ]
  );

  // Calculate cursor position relative to current character
  const getCursorStyle = useCallback(() => {
    if (!containerRef.current) return { left: 0, top: 0 };

    const wordElements = containerRef.current.querySelectorAll("[data-word]");
    const currentWordEl = wordElements[currentWordIndex] as HTMLElement;

    if (!currentWordEl) return { left: 0, top: 0 };

    const charElements = currentWordEl.querySelectorAll("[data-char]");
    const currentCharEl = charElements[currentCharIndex] as HTMLElement;

    if (currentCharEl) {
      const charRect = currentCharEl.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      return {
        left: charRect.left - containerRect.left,
        top: charRect.top - containerRect.top,
        height: charRect.height,
      };
    }

    // If beyond last char, position after last char
    const lastCharEl = charElements[charElements.length - 1] as HTMLElement;
    if (lastCharEl) {
      const charRect = lastCharEl.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      return {
        left: charRect.right - containerRect.left,
        top: charRect.top - containerRect.top,
        height: charRect.height,
      };
    }

    // Fallback
    const wordRect = currentWordEl.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      left: wordRect.left - containerRect.left,
      top: wordRect.top - containerRect.top,
      height: wordRect.height,
    };
  }, [currentWordIndex, currentCharIndex]);

  const cursorStyle = getCursorStyle();

  return (
    <div className="relative w-full">
      {/* Timer Display */}
      <div className="mb-8 flex items-center justify-center">
        <motion.div
          className={`font-mono text-5xl font-bold tabular-nums ${
            !hasStarted
              ? "text-zinc-700"
              : timeLeft <= 10
                ? "text-red-500"
                : "text-white"
          }`}
          animate={
            hasStarted && timeLeft <= 10
              ? { scale: [1, 1.05, 1] }
              : {}
          }
          transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
        >
          {timeLeft}
          <span className="text-zinc-600 text-3xl">s</span>
        </motion.div>
      </div>

      {/* Start Instruction */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 text-center"
          >
            <p className="font-mono text-base text-zinc-500">
              press{" "}
              <motion.span
                className="text-white px-2 py-1 bg-zinc-800 rounded"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                space
              </motion.span>{" "}
              to start
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden input for keyboard capture */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Type here"
      />

      {/* Words Display */}
      <div
        ref={containerRef}
        onClick={() => inputRef.current?.focus()}
        className="relative cursor-text select-none max-h-[55vh] overflow-y-auto"
      >
        {/* Cursor */}
        {hasStarted && timeLeft > 0 && (
          <motion.div
            className="absolute w-0.5 bg-cyan-400 rounded-full"
            style={{ 
              height: cursorStyle.height || 24,
              boxShadow: "0 0 8px rgba(34, 211, 238, 0.6), 0 0 16px rgba(34, 211, 238, 0.3)"
            }}
            initial={false}
            animate={{
              left: cursorStyle.left,
              top: cursorStyle.top,
              opacity: [1, 1, 0.3, 0.3, 1, 1],
            }}
            transition={{
              left: { type: "spring", stiffness: 500, damping: 30 },
              top: { type: "spring", stiffness: 500, damping: 30 },
              opacity: { duration: 1, repeat: Number.POSITIVE_INFINITY },
            }}
          />
        )}

        {/* Words */}
        <div className="flex flex-wrap gap-x-4 gap-y-3 font-mono text-xl sm:text-2xl leading-relaxed">
          {words.map((word, wordIndex) => {
            const wordTyped = typedChars[wordIndex] || [];
            const isCurrentWord = wordIndex === currentWordIndex;
            const isPastWord = wordIndex < currentWordIndex;

            return (
              <motion.span
                key={`${word}-${wordIndex}`}
                data-word={wordIndex}
                className="relative inline-block"
                initial={{ opacity: 0.3 }}
                animate={{
                  opacity: isPastWord ? 0.4 : isCurrentWord ? 1 : 0.6,
                }}
                transition={{ duration: 0.2 }}
              >
                {word.split("").map((char, charIndex) => {
                  const typed = wordTyped[charIndex];
                  const isCurrentChar = isCurrentWord && charIndex === currentCharIndex;

                  return (
                    <AnimatedChar
                      key={`${char}-${charIndex}-${wordIndex}`}
                      char={char}
                      isTyped={!!typed}
                      isCorrect={typed?.isCorrect ?? null}
                      isCurrentChar={isCurrentChar}
                      isCurrentWord={isCurrentWord}
                      isPastWord={isPastWord}
                      charIndex={charIndex}
                    />
                  );
                })}
                {/* Extra typed characters (overflow) */}
                {wordTyped.slice(word.length).map((typed, extraIndex) => (
                  <motion.span
                    key={`extra-${extraIndex}`}
                    className="text-red-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, x: [0, -2, 2, 0] }}
                    transition={{ duration: 0.2 }}
                  >
                    {typed.char}
                  </motion.span>
                ))}
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* Progress indicator */}
      <AnimatePresence>
        {hasStarted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex items-center justify-between font-mono text-sm text-zinc-500"
          >
            <span>
              <span className="text-white">{currentWordIndex}</span>
              <span className="text-zinc-600">/{words.length}</span> words
            </span>
            <span>
              <span className="text-white">{keystrokes.length}</span> keystrokes
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
