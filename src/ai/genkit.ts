import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

// This file is for initializing the Genkit instance and should not contain 'use server'.
// It allows for a clean separation of configuration from server actions.
export const ai = genkit({
  plugins: [googleAI()],
});
