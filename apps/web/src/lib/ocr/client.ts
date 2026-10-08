import "server-only";
import { GoogleGenAI } from "@google/genai";

/** Gemma 4 on the Gemini API. The only model used for OCR (no fallback). */
export const OCR_MODEL = "gemma-4-31b-it";

let client: GoogleGenAI | undefined;

export function getGenAI() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
