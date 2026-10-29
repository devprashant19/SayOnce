import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestLabEvidence, measured } from "@/lib/proof";

/**
 * /proof is the page most likely to be read as a factual claim, so the rule it
 * enforces is tested rather than trusted: **an unmeasured number renders as
 * "Not yet measured", never as a figure.**
 *
 * This suite exists because the page previously carried hardcoded numbers
 * captioned as measured. A test is the only thing that stops that returning.
 */

function labDir(runs: Array<{ name: string; body: unknown }>): string {
  const root = mkdtempSync(join(tmpdir(), "sayonce-proof-"));
  mkdirSync(join(root, ".lab"));
  for (const run of runs) {
    writeFileSync(join(root, ".lab", run.name), JSON.stringify(run.body), "utf8");
  }
  return root;
}

describe("measured()", () => {
  it("renders null as 'Not yet measured', not as zero", () => {
    const result = measured(null, (n) => `${n} min`);
    expect(result.text).toBe("Not yet measured");
    expect(result.isMeasured).toBe(false);
  });

  it("formats a real number", () => {
    const result = measured(11.3, (n) => `${n} min`);
    expect(result.text).toBe("11.3 min");
    expect(result.isMeasured).toBe(true);
  });

  it("treats a measured zero as measured", () => {
    // Zero minutes saved is a finding, not a missing value.
    const result = measured(0, (n) => `${n} min`);
    expect(result.text).toBe("0 min");
    expect(result.isMeasured).toBe(true);
  });
});

describe("latestLabEvidence", () => {
  it("returns null when no .lab directory exists", () => {
    const root = mkdtempSync(join(tmpdir(), "sayonce-nolab-"));
    try {
      expect(latestLabEvidence(root)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns null when every case errored — a failed run is not a zero score", () => {
    const root = labDir([
      {
        name: "run-2026-10-29T10-00-00-000Z.json",
        body: { at: "2026-10-29T10:00:00.000Z", results: [{ error: "HTTP 404" }] },
      },
    ]);
    try {
      expect(latestLabEvidence(root)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reads the newest run, not the first", () => {
    const scores = {
      inventedFacts: 0,
      privacy: 1,
      mustKnow: 1,
      routingRecall: 1,
      routingPrecision: 1,
      languageScript: 1,
      channelFit: 1,
    };
    const root = labDir([
      {
        name: "run-2026-10-29T10-00-00-000Z.json",
        body: { at: "old", results: [{ pass: false, scores: { ...scores, mustKnow: 0.5 } }] },
      },
      {
        name: "run-2026-10-29T18-00-00-000Z.json",
        body: { at: "new", results: [{ pass: true, scores }] },
      },
    ]);
    try {
      const lab = latestLabEvidence(root)!;
      expect(lab.at).toBe("new");
      expect(lab.mustKnow).toBe(1);
      expect(lab.passCount).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("sums invented facts rather than averaging them", () => {
    // One invented fact in one case fails the run. An average would hide it.
    const base = {
      privacy: 1,
      mustKnow: 1,
      routingRecall: 1,
      routingPrecision: 1,
      languageScript: 1,
      channelFit: 1,
    };
    const root = labDir([
      {
        name: "run-2026-10-29T10-00-00-000Z.json",
        body: {
          at: "x",
          results: [
            { pass: false, scores: { ...base, inventedFacts: 2 } },
            { pass: true, scores: { ...base, inventedFacts: 0 } },
          ],
        },
      },
    ]);
    try {
      const lab = latestLabEvidence(root)!;
      expect(lab.inventedFacts).toBe(2);
      expect(lab.gradedCount).toBe(2);
      expect(lab.passCount).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("excludes errored cases from the averages but counts them in caseCount", () => {
    const scores = {
      inventedFacts: 0,
      privacy: 1,
      mustKnow: 1,
      routingRecall: 1,
      routingPrecision: 1,
      languageScript: 1,
      channelFit: 1,
    };
    const root = labDir([
      {
        name: "run-2026-10-29T10-00-00-000Z.json",
        body: { at: "x", results: [{ pass: true, scores }, { error: "boom" }] },
      },
    ]);
    try {
      const lab = latestLabEvidence(root)!;
      expect(lab.caseCount).toBe(2);
      expect(lab.gradedCount).toBe(1);
      expect(lab.mustKnow).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("survives a corrupt run file", () => {
    const root = mkdtempSync(join(tmpdir(), "sayonce-badlab-"));
    mkdirSync(join(root, ".lab"));
    writeFileSync(join(root, ".lab", "run-2026-10-29T10-00-00-000Z.json"), "{not json", "utf8");
    try {
      expect(latestLabEvidence(root)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the page source carries no hardcoded evidence", () => {
  it("has no literal percentage or minute figures in /proof", async () => {
    const source = (
      await import("node:fs")
    ).readFileSync(
      new URL("../app/proof/page.tsx", import.meta.url),
      "utf8",
    );

    // The regression this guards: "94.2%", "12.0 minutes", "~42 sec", "4.6×"
    // were once static markup on this page, captioned as measured.
    const suspicious = source.match(/>\s*~?\d+(\.\d+)?\s*(%|min|sec|×|x)\b/g) ?? [];
    expect(suspicious).toEqual([]);
  });

  it("renders every figure through measured()", async () => {
    const source = (
      await import("node:fs")
    ).readFileSync(
      new URL("../app/proof/page.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("measured(");
    expect(source).toContain("proofEvidence");
  });
});
