import { gateway } from "ai";

// Vercel AI Gateway Configuration
// Uses AI_GATEWAY_API_KEY from environment variables automatically
// Model format: provider/model-name

export const model = gateway("google/gemini-2.5-flash-lite");
