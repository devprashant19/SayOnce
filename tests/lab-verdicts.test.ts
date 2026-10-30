import { describe, it, expect } from "vitest";
import { labMetricRows, labPassRate, NOT_RUN, type LabAggregates } from "@/lib/lab-verdicts";

/**
 * Production /lab showed eight PASS verdicts and a perfect set of figures with
 * no benchmark run on record: every missing metric was filled with its own
 * target and marked as passing. These hold the line that missing data is
 * never a pass, and that measured data is judged by the real thresholds.
 */
describe("Quality Lab verdicts", () => {
  it("reports no result, and no pass, when nothing has run", () => {
    for (const missing of [undefined, null]) {
      const rows = labMetricRows(missing);
      expect(rows).toHaveLength(7);
      for (const row of rows) {
        expect(row.verdict).toBe("not-run");
        expect(row.result).toBe(NOT_RUN);
        expect(row.value).toBeNull();
        // The old bug: the target standing in for a measurement.
        expect(row.result).not.toBe(row.target);
      }
    }
    expect(labPassRate(undefined)).toBeNull();
    expect(labPassRate({ caseCount: 20, results: [] })).toBeNull();
  });

  it("judges measured data against the real thresholds", () => {
    const measured: LabAggregates = {
      inventedFacts: 0,
      privacy: 1,
      mustKnow: 0.714,
      routingRecall: 1,
      routingPrecision: 1,
      languageScript: 1,
      channelFit: 1,
    };
    const byKey = Object.fromEntries(labMetricRows(measured).map((r) => [r.key, r]));
    expect(byKey.inventedFacts!.verdict).toBe("pass");
    expect(byKey.privacy!.verdict).toBe("pass");
    expect(byKey.mustKnow!.verdict).toBe("below");
    expect(byKey.mustKnow!.result).toBe("71.4%");
  });

  it("fails a hard gate rather than calling it below target", () => {
    const leaked: LabAggregates = {
      inventedFacts: 2,
      privacy: 0.9,
      mustKnow: 1,
      routingRecall: 1,
      routingPrecision: 1,
      languageScript: 1,
      channelFit: 1,
    };
    const byKey = Object.fromEntries(labMetricRows(leaked).map((r) => [r.key, r]));
    expect(byKey.inventedFacts!.verdict).toBe("failed");
    expect(byKey.privacy!.verdict).toBe("failed");
  });

  it("counts a run whose cases all failed as a real 0 of 20", () => {
    const run = { caseCount: 20, results: Array.from({ length: 20 }, () => ({ pass: false })) };
    expect(labPassRate(run)).toEqual({ passed: 0, total: 20, percent: 0 });
  });
});
