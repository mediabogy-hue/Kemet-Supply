'use server';

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Initializes and exports the global Genkit AI instance.
 * This ensures that Genkit is initialized only once.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
});
