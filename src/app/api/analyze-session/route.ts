import { generateText } from "ai";
import { model } from "~/lib/ai-config";
import type { Keystroke, SessionResult } from "~/lib/types";

interface AnalysisRequest {
  keystrokes: Keystroke[];
  text: string;
  timeElapsed: number;
  completedWords: number;
  totalWords: number;
}

export async function POST(request: Request) {
  try {
    const body: AnalysisRequest = await request.json();
    const { keystrokes, timeElapsed, completedWords, totalWords } = body;

    // Calculate basic stats locally first
    const totalKeystrokes = keystrokes.length;
    const correctKeystrokes = keystrokes.filter((k) => k.isCorrect).length;
    const accuracy = totalKeystrokes > 0 
      ? Math.round((correctKeystrokes / totalKeystrokes) * 100) 
      : 0;

    // Calculate WPM (words per minute)
    // Standard: 5 characters = 1 word
    const timeInMinutes = timeElapsed / 60;
    const charactersTyped = keystrokes.filter((k) => k.key !== "Backspace").length;
    const wpm = timeInMinutes > 0 
      ? Math.round((charactersTyped / 5) / timeInMinutes) 
      : 0;

    // Find struggling keys (keys with most errors)
    const keyErrors: Record<string, { errors: number; delays: number[] }> = {};
    
    for (let i = 0; i < keystrokes.length; i++) {
      const k = keystrokes[i];
      if (!k.isCorrect && k.key !== "Backspace") {
        const key = k.expected.toLowerCase();
        if (!keyErrors[key]) {
          keyErrors[key] = { errors: 0, delays: [] };
        }
        keyErrors[key].errors++;
        
        // Calculate delay from previous keystroke
        if (i > 0) {
          const delay = k.timestamp - keystrokes[i - 1].timestamp;
          keyErrors[key].delays.push(delay);
        }
      }
    }

    const strugglingKeys = Object.entries(keyErrors)
      .map(([key, data]) => ({
        key,
        errorCount: data.errors,
        avgDelay: data.delays.length > 0 
          ? Math.round(data.delays.reduce((a, b) => a + b, 0) / data.delays.length)
          : 0,
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 5);

    // Get AI insights for more detailed analysis
    let aiInsights = "";
    try {
      const { text: insights } = await generateText({
        model,
        prompt: `Analyze this typing session data and provide a brief, encouraging insight (max 2 sentences):
- WPM: ${wpm}
- Accuracy: ${accuracy}%
- Struggling keys: ${strugglingKeys.map(k => k.key).join(", ") || "none"}
- Words completed: ${completedWords}/${totalWords}
- Total keystrokes: ${totalKeystrokes}

Be encouraging and give one specific tip for improvement.`,
      });
      aiInsights = insights;
    } catch {
      aiInsights = accuracy >= 95 
        ? "Excellent accuracy! Try increasing your speed gradually."
        : "Focus on accuracy first, speed will follow with practice.";
    }

    const result: SessionResult & { aiInsights: string } = {
      wpm,
      accuracy,
      strugglingKeys,
      totalKeystrokes,
      correctKeystrokes,
      timeElapsed,
      completedWords,
      totalWords,
      aiInsights,
    };

    return Response.json(result);
  } catch (error) {
    console.error("Error analyzing session:", error);
    return Response.json(
      { error: "Failed to analyze session" },
      { status: 500 }
    );
  }
}
