import { LAB_DATASET, REAL_DATASET } from "./db";

/** Who sent a fan-out: a person using the app, or the Quality Lab replaying a golden case. */
export type FanoutSource = "app" | "lab";

/**
 * The dataset an update is filed under. One decision, used by every place that
 * saves an update, because getting it wrong is silent: /proof counts
 * REAL_DATASET as the speaker's own use, so a misfiled row becomes a figure
 * nobody earned.
 *
 *   lab traffic            -> LAB_DATASET, whatever roster it used
 *   the real roster        -> REAL_DATASET
 *   a judge's demo session -> demo_<session id>
 *   anything else          -> the roster name
 */
export function datasetFor(opts: {
  source: FanoutSource;
  contactSet: string;
  demoSessionId?: string;
}): string {
  if (opts.source === "lab") return LAB_DATASET;
  if (opts.contactSet === "freelance") return REAL_DATASET;
  return opts.demoSessionId ? `demo_${opts.demoSessionId}` : opts.contactSet;
}
