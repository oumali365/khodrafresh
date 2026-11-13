// ============================================================
// src/server/geminiClient.ts
// عميل Gemini SDK الرسمي للواجهة الخلفية (Server-Side)
// يستخدم @google/genai و process.env.GEMINI_API_KEY
// ============================================================

import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return geminiClient;
}

export const GEMINI_MODEL = 'gemini-3.8-flash';
