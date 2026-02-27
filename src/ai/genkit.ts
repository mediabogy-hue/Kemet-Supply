import * as genkitCore from '@genkit-ai/core';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkitCore.genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-pro-latest',
});
