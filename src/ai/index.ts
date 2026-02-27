import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit and export the 'ai' object.
// The 'model' property is not valid here; models are specified in 'generate' calls.
export const ai = genkit({
  plugins: [googleAI()],
});
