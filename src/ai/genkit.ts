import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Initializes and exports the global Genkit AI instance.
 * This file should NOT have 'use server' at the top.
 * This ensures that Genkit is initialized only once in a clean, non-server-action context.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
});
