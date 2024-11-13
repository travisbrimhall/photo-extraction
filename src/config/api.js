import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Initialize Anthropic client
// export const anthropic = new Anthropic({
//     apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
//     dangerouslyAllowBrowser: true
// });
export const anthropic = null;

// Initialize OpenAI client
export const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
}); 