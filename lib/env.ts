/**
 * Server-side environment access.
 *
 * Importing this file from a client component is a build error by design: it
 * reads secrets. Nothing in SayOnce is ever exposed with a NEXT_PUBLIC_ prefix.
 */

import "server-only";

function required(name: string, hint: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is not set. ${hint}`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  /**
   * Gemini API key. A free one comes from Google AI Studio
   * (aistudio.google.com/apikey); GOOGLE_API_KEY is accepted as an alias
   * because that is what most Google examples use.
   */
  get apiKey(): string {
    const value = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!value || value.trim().length === 0) {
      throw new Error(
        "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey, " +
          "then copy .env.example to .env.local and paste it in.",
      );
    }
    return value;
  },
  /** One fixed model for every AI step, so accuracy scores stay comparable. */
  get model(): string {
    return process.env.SAYONCE_MODEL ?? "gemini-2.5-flash";
  },
  /**
   * Low rather than zero for the pipeline: extraction and composition need a
   * little latitude to phrase a message naturally. The grader runs at 0.
   */
  get temperature(): number {
    return optionalNumber("SAYONCE_TEMPERATURE", 0.2);
  },
  /** The grader must be repeatable. Do not move this during the build. */
  get graderTemperature(): number {
    return optionalNumber("SAYONCE_GRADER_TEMPERATURE", 0);
  },
  /**
   * Reasoning budget in tokens for the 2.5 series: 0 is off, -1 is automatic.
   * Null means send no thinking config at all, which is what a model outside
   * the 2.5/3 series needs.
   */
  get thinkingBudget(): number | null {
    const raw = process.env.SAYONCE_THINKING_BUDGET;
    if (raw === "none") return null;
    return optionalNumber("SAYONCE_THINKING_BUDGET", -1);
  },
  get databaseUrl(): string {
    return required("DATABASE_URL", "Phase 2 onwards needs it; see .env.example.");
  },
  get hasDatabase(): boolean {
    return Boolean(process.env.DATABASE_URL);
  },
  get demoLiveAi(): boolean {
    return (process.env.DEMO_LIVE_AI ?? "on").toLowerCase() !== "off";
  },
  get demoSessionAiCap(): number {
    return optionalNumber("DEMO_SESSION_AI_CAP", 10);
  },
  get demoDailyAiCap(): number {
    return optionalNumber("DEMO_DAILY_AI_CAP", 400);
  },
  get demoSessionSecret(): string {
    const val = process.env.DEMO_SESSION_SECRET;
    if (val && val.trim().length > 0) return val;
    if (process.env.NODE_ENV === "production") {
      return required("DEMO_SESSION_SECRET", "Phase D needs it; 32+ random bytes, base64.");
    }
    return "sayonce_dev_demo_session_secret_32bytes_min_fallback_key=";
  },
  /** Null until a real baseline has been measured. Never faked. */
  get baselineMinutes(): number | null {
    const raw = process.env.SAYONCE_BASELINE_MINUTES;
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  },
};
