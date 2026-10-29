import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "../env";

let client: GoogleGenAI | null = null;

/** One client for the process. Constructed lazily so a build needs no key. */
export function gemini(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.apiKey });
  }
  return client;
}
