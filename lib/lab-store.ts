import "server-only";
import { desc } from "drizzle-orm";
import { db, schema } from "./db";
import { env } from "./env";

/**
 * Quality Lab runs, as stored in the database.
 *
 * `npm run lab` writes each run to `.lab/` on the machine that ran it, and the
 * deployed site has no `.lab/`: production showed "no run yet" however many
 * runs existed. The runner now also stores each run's scores in `lab_runs`,
 * which is what production reads. Scores and case ids only — never the private
 * golden-set text, nor grading detail that quotes it.
 */

export interface StoredCase {
  id: string;
  group: string;
  pass: boolean;
  scores: Record<string, number> | null;
  /** Set when the case could not run live; such a case has no score. */
  error?: string;
  trailOk: boolean;
}

export interface StoredLabRun {
  at: string;
  model: string;
  graderTemperature: number;
  caseCount: number;
  /** Metric aggregates, plus gradedCount and passCount. */
  scores: Record<string, number>;
  perCase: StoredCase[];
  passed: boolean;
}

/** The newest stored runs, newest first. Empty without a database. */
export async function storedLabRuns(limit = 10): Promise<StoredLabRun[]> {
  if (!env.hasDatabase) return [];
  try {
    const rows = await db()
      .select()
      .from(schema.labRuns)
      .orderBy(desc(schema.labRuns.startedAt))
      .limit(limit);
    return rows.map((row) => ({
      at: row.startedAt.toISOString(),
      model: row.model,
      graderTemperature: row.graderTemperature,
      caseCount: row.caseCount,
      scores: row.scores,
      perCase: row.perCase as StoredCase[],
      passed: row.passed,
    }));
  } catch (error) {
    console.error("Failed to read stored lab runs:", error);
    return [];
  }
}
