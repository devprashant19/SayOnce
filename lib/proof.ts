import "server-only";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getAllUpdates } from "./update-repo";
import { countWords } from "./voice-return";
import { env } from "./env";

/**
 * The evidence behind /proof.
 *
 * One rule governs this whole file: **a number that has not been measured is
 * `null`, and `null` renders as "not yet measured" — never as a figure.**
 *
 * It exists because the alternative is worse than an empty page. A judge who
 * asks "how did you measure that?" and gets no answer has learned something
 * about every other claim on the site. An honest gap beside a real Quality Lab
 * score is a stronger position than a confident number with nothing behind it.
 *
 * Real-use totals come from the `real` dataset only — a judge pressing Fan out
 * in demo mode must never inflate them. Accuracy comes from the latest Quality
 * Lab run on disk. The time saving is computed only when a measured baseline
 * and measured elapsed times both exist.
 */

export interface RealUseEvidence {
  updateCount: number;
  messageCount: number;
  sentMessageCount: number;
  /** Distinct recipients reached. Not languages — /proof never reads contacts. */
  recipientCount: number;
  wordsSpoken: number;
  wordsDelivered: number;
  /** Words delivered per word spoken. Null until something has been spoken. */
  amplification: number | null;
  /** Measured minutes per update before SayOnce. Null until measured. */
  baselineMinutes: number | null;
  /** Measured average, opening Speak to last send. Null until measured. */
  actualMinutes: number | null;
  /** Non-null only when both of the two above are. */
  minutesSavedPerUpdate: number | null;
  /** Non-null only when minutesSavedPerUpdate is. */
  percentSaved: number | null;
  /** How many updates contributed a measured elapsed time. */
  timedUpdateCount: number;
}

export interface LabEvidence {
  at: string;
  caseCount: number;
  gradedCount: number;
  passCount: number;
  /** A count, not a rate: one invented fact in one case fails the run. */
  inventedFacts: number;
  privacy: number;
  mustKnow: number;
  routingRecall: number;
  routingPrecision: number;
  languageScript: number;
  channelFit: number;
}

export interface ProofEvidence {
  realUse: RealUseEvidence;
  lab: LabEvidence | null;
  /** True when nothing has been measured yet, so the page can say so plainly. */
  isEmpty: boolean;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export async function realUseEvidence(): Promise<RealUseEvidence> {
  const baselineMinutes = env.baselineMinutes;

  let updates: Awaited<ReturnType<typeof getAllUpdates>> = [];
  try {
    updates = await getAllUpdates("real");
  } catch {
    // No database configured yet, or unreachable. An empty result is the
    // truthful answer here, not an error page.
    updates = [];
  }

  const messages = updates.flatMap((update) => update.messages);
  const wordsSpoken = updates.reduce((total, u) => total + countWords(u.rawText), 0);
  const wordsDelivered = messages.reduce(
    (total, m) => total + countWords(m.subject ?? "") + countWords(m.body),
    0,
  );

  const timed = updates.filter(
    (u) => typeof u.elapsedSeconds === "number" && u.elapsedSeconds > 0,
  );
  const actualMinutes =
    timed.length === 0
      ? null
      : round1(
          timed.reduce((total, u) => total + (u.elapsedSeconds ?? 0), 0) / timed.length / 60,
        );

  // The two measurements must exist independently. A baseline with no real use,
  // or real use with no timings, yields no saving — by design.
  const minutesSavedPerUpdate =
    baselineMinutes === null || actualMinutes === null
      ? null
      : round1(Math.max(0, baselineMinutes - actualMinutes));

  const percentSaved =
    minutesSavedPerUpdate === null || baselineMinutes === null || baselineMinutes <= 0
      ? null
      : round1((minutesSavedPerUpdate / baselineMinutes) * 100);

  return {
    updateCount: updates.length,
    messageCount: messages.length,
    sentMessageCount: messages.filter((m) => m.sent).length,
    recipientCount: new Set(messages.map((m) => m.contactId)).size,
    wordsSpoken,
    wordsDelivered,
    amplification: wordsSpoken === 0 ? null : round1(wordsDelivered / wordsSpoken),
    baselineMinutes,
    actualMinutes,
    minutesSavedPerUpdate,
    percentSaved,
    timedUpdateCount: timed.length,
  };
}

interface LabRunFile {
  at?: string;
  results?: Array<{
    error?: string;
    pass?: boolean;
    scores?: Record<string, number>;
  }>;
}

type GradedResult = { pass?: boolean; scores?: Record<string, number> };

function meanOf(graded: GradedResult[], key: string): number {
  if (graded.length === 0) return 0;
  const total = graded.reduce((sum, r) => sum + (r.scores?.[key] ?? 0), 0);
  return round3(total / graded.length);
}

/**
 * The most recent Quality Lab run from `.lab/`. Returns null when none exists,
 * rather than zeroes — a run that never happened is not a run that scored zero.
 */
export function latestLabEvidence(root = process.cwd()): LabEvidence | null {
  const dir = join(root, ".lab");
  if (!existsSync(dir)) return null;

  const newest = readdirSync(dir)
    .filter((name) => name.startsWith("run-") && name.endsWith(".json"))
    .sort()
    .at(-1);
  if (!newest) return null;

  let parsed: LabRunFile;
  try {
    parsed = JSON.parse(readFileSync(join(dir, newest), "utf8")) as LabRunFile;
  } catch {
    return null;
  }

  const results = parsed.results ?? [];
  const graded: GradedResult[] = results.filter((r) => !r.error && r.scores);
  if (graded.length === 0) return null;

  return {
    at: parsed.at ?? newest.replace(/^run-|\.json$/g, ""),
    caseCount: results.length,
    gradedCount: graded.length,
    passCount: graded.filter((r) => r.pass).length,
    inventedFacts: graded.reduce((total, r) => total + (r.scores?.inventedFacts ?? 0), 0),
    privacy: meanOf(graded, "privacy"),
    mustKnow: meanOf(graded, "mustKnow"),
    routingRecall: meanOf(graded, "routingRecall"),
    routingPrecision: meanOf(graded, "routingPrecision"),
    languageScript: meanOf(graded, "languageScript"),
    channelFit: meanOf(graded, "channelFit"),
  };
}

export async function proofEvidence(): Promise<ProofEvidence> {
  const realUse = await realUseEvidence();
  const lab = latestLabEvidence();
  return { realUse, lab, isEmpty: realUse.updateCount === 0 && lab === null };
}

export interface Measured {
  text: string;
  isMeasured: boolean;
}

/** Renders a measured number, or says plainly that it is not measured yet. */
export function measured(
  value: number | null,
  format: (n: number) => string,
): Measured {
  return value === null
    ? { text: "Not yet measured", isMeasured: false }
    : { text: format(value), isMeasured: true };
}
