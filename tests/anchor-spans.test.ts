import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { anchorSpans } from "@/lib/anchor-spans";
import type { Fact } from "@/lib/types";

/**
 * The model reports where each fact sits in the spoken text as character
 * offsets, and models cannot count characters: in the prepared demo, 23 of 25
 * spans pointed at the wrong words, so hovering "rescheduled to Monday" lit up
 * "four hundred. So delivery Friday nahi hogi". Code re-anchors them.
 */
function fact(id: string, text: string, start: number, end: number): Fact {
  return {
    id,
    text,
    type: "status",
    values: { numbers: [], datesIso: [], names: [] },
    sourceSpan: { start, end },
    privacy: { blockedFor: [], reason: "" },
  };
}

const SPOKEN =
  "Okay so the Bhiwandi dispatch, um, the truck didn't leave today. We needed four hundred. " +
  "So delivery Friday nahi hogi, now it's Monday. The audit is on Tuesday, no wait, Wednesday.";

describe("anchorSpans", () => {
  it("moves a drifted span onto the fact's own words", () => {
    const [f] = anchorSpans(SPOKEN, [fact("f4", "delivery Friday nahi hogi, now it's Monday", 70, 112)]);
    expect(SPOKEN.slice(f!.sourceSpan.start, f!.sourceSpan.end)).toBe("delivery Friday nahi hogi, now it's Monday");
  });

  it("covers a paraphrased fact with the words it came from", () => {
    const [f] = anchorSpans(SPOKEN, [fact("f1", "The audit is on Wednesday", 0, 10)]);
    const covered = SPOKEN.slice(f!.sourceSpan.start, f!.sourceSpan.end);
    expect(covered.startsWith("The audit is on")).toBe(true);
    expect(covered).toContain("Wednesday");
  });

  it("picks the occurrence nearest the model's guess when words repeat", () => {
    const text = "Monday ko aana. Phir se, Monday ko aana.";
    const [f] = anchorSpans(text, [fact("f1", "Monday ko aana", 22, 36)]);
    expect(f!.sourceSpan.start).toBe(text.lastIndexOf("Monday"));
  });

  it("keeps a span it cannot place, clamped inside the text", () => {
    const [f] = anchorSpans("short text", [fact("f1", "something never said", 5, 400)]);
    expect(f!.sourceSpan).toEqual({ start: 5, end: 10 });
  });

  it("lands every prepared demo fact on words that belong to it", () => {
    const prepared = JSON.parse(
      readFileSync(join(process.cwd(), "data", "demo", "cached-results.json"), "utf8"),
    ) as Record<string, { spokenText: string; facts: Fact[] }>;
    for (const result of Object.values(prepared)) {
      if (!Array.isArray(result.facts)) continue;
      for (const f of anchorSpans(result.spokenText, result.facts)) {
        const covered = result.spokenText.slice(f.sourceSpan.start, f.sourceSpan.end).toLowerCase();
        const first = f.text.toLowerCase().match(/[\p{L}\p{N}']+/u)![0];
        expect(covered, `${f.id}: ${f.text}`).toContain(first);
      }
    }
  });
});
