import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

// Centralized Genkit initialization.
// This ensures that the AI instance is a clean, separate module
// that can be imported safely by server actions without causing
// build-time conflicts with Next.js.
export const ai = genkit({
  plugins: [googleAI()],
});
