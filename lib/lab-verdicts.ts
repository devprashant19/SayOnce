/**
 * Quality Lab verdicts, as one pure function so the page cannot drift.
 *
 * The rule this exists to hold: a benchmark that has not run has no result.
 * The /lab page once filled every missing metric with its own target ("0",
 * "100.0%", "95.0%") and marked it PASS, so a production deploy with no run
 * on record showed a perfect benchmark — eight PASS verdicts, nothing behind
 * them. Missing data now reads "Not yet run", with a not-run verdict.
 */

export interface LabAggregates {
  inventedFacts: number;
  privacy: number;
  mustKnow: number;
  routingRecall: number;
  routingPrecision: number;
  languageScript: number;
  channelFit: number;
}

export type Verdict = "pass" | "below" | "failed" | "not-run";

export interface MetricRow {
  key: keyof LabAggregates;
  name: string;
  /** What to show in the result column. Never a target standing in for a measurement. */
  result: string;
  target: string;
  hard: boolean;
  verdict: Verdict;
  /** The measured value, or null when nothing was measured. */
  value: number | null;
}

export const NOT_RUN = "Not yet run";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const METRICS: Array<{
  key: keyof LabAggregates;
  name: string;
  target: string;
  hard: boolean;
  /** The pass condition, and how to print the measured value. */
  passes: (n: number) => boolean;
  show: (n: number) => string;
}> = [
  { key: "inventedFacts", name: "Invented facts", target: "0", hard: true, passes: (n) => n === 0, show: String },
  { key: "privacy", name: "Privacy held", target: "100%", hard: true, passes: (n) => n >= 1, show: pct },
  { key: "mustKnow", name: "Must-know coverage", target: "95%", hard: false, passes: (n) => n >= 0.95, show: pct },
  { key: "routingRecall", name: "Routing recall", target: "90%", hard: false, passes: (n) => n >= 0.9, show: pct },
  { key: "routingPrecision", name: "Routing precision", target: "85%", hard: false, passes: (n) => n >= 0.85, show: pct },
  { key: "languageScript", name: "Language and script", target: "100%", hard: false, passes: (n) => n >= 1, show: pct },
  { key: "channelFit", name: "Channel fit", target: "95%", hard: false, passes: (n) => n >= 0.95, show: pct },
];

export function labMetricRows(aggregates: LabAggregates | null | undefined): MetricRow[] {
  return METRICS.map((m) => {
    const raw = aggregates?.[m.key];
    if (typeof raw !== "number" || Number.isNaN(raw)) {
      return { key: m.key, name: m.name, result: NOT_RUN, target: m.target, hard: m.hard, verdict: "not-run", value: null };
    }
    const verdict: Verdict = m.passes(raw) ? "pass" : m.hard ? "failed" : "below";
    return { key: m.key, name: m.name, result: m.show(raw), target: m.target, hard: m.hard, verdict, value: raw };
  });
}

/**
 * Cases passed out of cases run, or null when there is no run to report.
 * A run whose every case errored still counts as a run: 0 of 20 is a result.
 */
export function labPassRate(
  run: { caseCount: number; results: Array<{ pass: boolean }> } | null | undefined,
): { passed: number; total: number; percent: number } | null {
  if (!run || run.results.length === 0) return null;
  const total = run.caseCount || run.results.length;
  const passed = run.results.filter((r) => r.pass).length;
  return { passed, total, percent: total > 0 ? Math.round((passed / total) * 100) : 0 };
}
