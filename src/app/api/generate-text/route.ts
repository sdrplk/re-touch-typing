import { generateText } from "ai";
import { model } from "~/lib/ai-config";

interface PerformanceData {
  strugglingKeys: { key: string; errorCount: number }[];
  accuracy: number;
  wpm: number;
  recentErrors: string[];
}

// Words that contain rare letters to ensure all 26 letters are covered
const alphabetCoverageWords: Record<string, string[]> = {
  q: ["quick", "quiet", "queen", "quiz", "quote"],
  x: ["box", "fox", "mix", "fix", "next", "text", "exam"],
  z: ["zero", "zone", "size", "maze", "jazz", "fizz", "buzz"],
  j: ["just", "jump", "join", "job", "joy", "major"],
  k: ["keep", "know", "kind", "key", "kick", "make", "take"],
  v: ["very", "have", "give", "live", "move", "over", "view"],
  w: ["with", "will", "work", "want", "way", "new", "now"],
};

const fallbackWords = [
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "her", "was", "one", "our", "out", "day", "get", "has", "him", "his",
  "how", "its", "may", "new", "now", "old", "see", "way", "who", "boy",
  "did", "let", "put", "say", "she", "too", "use", "add", "ago", "air",
  "also", "ask", "back", "been", "best", "big", "both", "call", "came",
  "come", "could", "down", "each", "end", "even", "few", "find", "first",
  "from", "give", "good", "great", "hand", "have", "help", "here", "high",
  "home", "just", "keep", "kind", "know", "last", "left", "life", "like",
  "line", "live", "long", "look", "made", "make", "many", "more", "most",
  "much", "must", "name", "need", "next", "only", "open", "over", "own",
];

// Check which letters are missing from the text
function getMissingLetters(text: string): string[] {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const textLower = text.toLowerCase();
  return alphabet.split("").filter((letter) => !textLower.includes(letter));
}

// Add words to cover missing letters
function ensureAllLetters(words: string[]): string[] {
  const text = words.join(" ");
  const missing = getMissingLetters(text);
  
  if (missing.length === 0) return words;
  
  const result = [...words];
  
  for (const letter of missing) {
    // Find a word containing this letter
    const coverageWords = alphabetCoverageWords[letter];
    if (coverageWords && coverageWords.length > 0) {
      // Replace a random word in the middle of the array
      const insertIndex = Math.floor(result.length / 2) + Math.floor(Math.random() * 10);
      const wordToAdd = coverageWords[Math.floor(Math.random() * coverageWords.length)];
      if (insertIndex < result.length) {
        result[insertIndex] = wordToAdd;
      } else {
        result.push(wordToAdd);
      }
    } else {
      // Find any fallback word containing this letter
      const wordWithLetter = fallbackWords.find((w) => w.includes(letter));
      if (wordWithLetter) {
        const insertIndex = Math.floor(result.length / 2) + Math.floor(Math.random() * 10);
        if (insertIndex < result.length) {
          result[insertIndex] = wordWithLetter;
        }
      }
    }
  }
  
  return result.slice(0, 90);
}

function cleanAndPadWords(text: string): string[] {
  let words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0 && word.length <= 10)
    .slice(0, 90);

  while (words.length < 90) {
    words.push(fallbackWords[words.length % fallbackWords.length]);
  }

  // Ensure all 26 letters are present
  words = ensureAllLetters(words);

  return words;
}

// POST handler for personalized text based on performance data
export async function POST(request: Request) {
  try {
    const body: { performanceData?: PerformanceData } = await request.json().catch(() => ({}));
    const performanceData = body.performanceData;

    let prompt = `Generate exactly 90 English words for a touch typing practice session.`;
    let isPersonalized = false;

    if (performanceData && performanceData.strugglingKeys.length > 0) {
      const weakKeys = performanceData.strugglingKeys.map(k => k.key).join(", ");
      const accuracy = performanceData.accuracy;
      isPersonalized = true;
      
      prompt = `Generate exactly 90 English words for a PERSONALIZED touch typing practice session.

USER PERFORMANCE DATA:
- Current accuracy: ${accuracy}%
- Struggling keys (need more practice): ${weakKeys}
- Target: Improve accuracy by 25%

CRITICAL REQUIREMENTS:
1. The text MUST include ALL 26 letters of the alphabet (a-z) at least once
2. Include 60-70% of words that contain the struggling keys: ${weakKeys}
3. For each struggling key, include at least 8-10 words featuring that letter prominently
4. Mix word difficulties: 40% easy (3-4 letters), 40% medium (5-6 letters), 20% challenging (7-8 letters)
5. Include words where struggling keys appear at different positions (start, middle, end)
6. Use words with rare letters like: quick, fox, jazz, zero, box, quiz, jump, vex

WORD SELECTION STRATEGY FOR ${weakKeys}:
- Words starting with these letters
- Words ending with these letters  
- Words with these letters in the middle
- Words with repeated instances of these letters
- Common bigrams/trigrams containing these letters`;
    }

    prompt += `

CRITICAL: The generated text MUST include ALL 26 letters of the alphabet (a-z) at least once.
Include words like: quick, fox, jump, lazy, box, quiz, zero, jazz, vex to cover rare letters.

STRICT FORMAT RULES:
- Only lowercase letters
- No punctuation, no special characters, no numbers
- Separate words with single spaces
- Words should be 3-8 letters each
- Use real, common English words only

Output ONLY the 90 words separated by spaces, nothing else.`;

    const { text } = await generateText({
      model,
      prompt,
    });

    const words = cleanAndPadWords(text);

    return Response.json({ 
      text: words.join(" "), 
      words,
      isPersonalized,
      targetKeys: performanceData?.strugglingKeys.map(k => k.key) || [],
    });
  } catch (error) {
    console.error("Error generating personalized text:", error);
    
    // Fallback text that includes all 26 letters
    const fallbackText = "the quick brown fox jumps over lazy dog and runs away into forest where many animals live together in peace under tall trees that provide shade from hot summer sun while birds sing their sweet songs high above branches where they build nests to raise young ones who will soon learn fly explore world beyond home this beautiful natural place with amazing views and exciting journeys through vast open spaces";
    const words = cleanAndPadWords(fallbackText);
    
    return Response.json({ 
      text: words.join(" "), 
      words, 
      isPersonalized: false,
      targetKeys: [],
    });
  }
}

// GET handler for initial load without performance data
export async function GET() {
  try {
    const { text } = await generateText({
      model,
      prompt: `Generate exactly 90 common English words for a touch typing practice session.

CRITICAL REQUIREMENTS:
1. The text MUST include ALL 26 letters of the alphabet (a-z) at least once
2. Use simple, common words (3-8 letters each)
3. Mix of short and medium length words
4. Include words with rare letters like: quick, fox, jazz, zero, box, quiz, jump, vex, lazy
5. No punctuation, no special characters, no numbers
6. Only lowercase letters
7. Separate words with single spaces

Example words to include for full alphabet coverage:
- q: quick, quiet, queen, quiz
- x: box, fox, mix, fix, next
- z: zero, zone, size, maze, jazz
- j: just, jump, join, job, joy
- v: very, have, give, live, view
- w: with, will, work, want, way

Output ONLY the 90 words separated by spaces, nothing else.`,
    });

    const words = cleanAndPadWords(text);

    return Response.json({ 
      text: words.join(" "), 
      words, 
      isPersonalized: false,
      targetKeys: [],
    });
  } catch (error) {
    console.error("Error generating text:", error);
    
    // Fallback text that includes all 26 letters
    const fallbackText = "the quick brown fox jumps over lazy dog and runs away into forest where many animals live together in peace under tall trees that provide shade from hot summer sun while birds sing their sweet songs high above branches where they build nests to raise young ones who will soon learn fly explore world beyond home this beautiful natural place with amazing views and exciting journeys through vast open spaces";
    const words = cleanAndPadWords(fallbackText);
    
    return Response.json({ 
      text: words.join(" "), 
      words, 
      isPersonalized: false,
      targetKeys: [],
    });
  }
}
