export interface Keystroke {
  char: string;
  expected: string;
  timestamp: number;
  key: string;
  isCorrect: boolean;
  wordIndex: number;
  charIndex: number;
}

export interface SessionResult {
  wpm: number;
  accuracy: number;
  strugglingKeys: { key: string; errorCount: number; avgDelay: number }[];
  totalKeystrokes: number;
  correctKeystrokes: number;
  timeElapsed: number;
  completedWords: number;
  totalWords: number;
}

export interface Challenge {
  id: string;
  text: string;
  keystrokes: Keystroke[];
  result: SessionResult | null;
  startTime: number | null;
  endTime: number | null;
}
