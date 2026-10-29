/**
 * Server-side environment access.
 *
 * Importing this file from a client component is a build error by design: it
 * reads secrets. Nothing in SayOnce is ever exposed with a NEXT_PUBLIC_ prefix.
 */

import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in.`,
    );
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
  get anthropicApiKey(): string {
    return required("ANTHROPIC_API_KEY");
  },
  /** One fixed model for every AI step, so accuracy scores stay comparable. */
  get model(): string {
    return process.env.SAYONCE_MODEL ?? "claude-opus-5-5";
  },
  get effort(): "low" | "medium" | "high" | "xhigh" | "max" {
    const raw = process.env.SAYONCE_EFFORT ?? "medium";
    return (["low", "medium", "high", "xhigh", "max"] as const).includes(raw as never)
      ? (raw as "low" | "medium" | "high" | "xhigh" | "max")
      : "medium";
  },
  /** The grader runs at a fixed low effort so Quality Lab runs are comparable. */
  get graderEffort(): "low" | "medium" | "high" {
    const raw = process.env.SAYONCE_GRADER_EFFORT ?? "low";
    return (["low", "medium", "high"] as const).includes(raw as never)
      ? (raw as "low" | "medium" | "high")
      : "low";
  },
  get databaseUrl(): string {
    return required("DATABASE_URL");
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
    return required("DEMO_SESSION_SECRET");
  },
  /** Null until a real baseline has been measured. Never faked. */
  get baselineMinutes(): number | null {
    const raw = process.env.SAYONCE_BASELINE_MINUTES;
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  },
};
