import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GoldenCase } from "@/lib/types";
import { contactSetNames, loadContactSet } from "@/lib/contact-sets";

/**
 * The fixtures the whole build runs on: the contact sets and the golden sets.
 *
 * A malformed golden case does not fail loudly — the lab runner skips or
 * mis-grades it, and the metric quietly means something else. So the shape is
 * checked here, and so is the one invariant a human gets wrong when writing
 * cases by hand: a fact listed as both must-know and blocked for the same
 * person.
 */

function readJson(relative: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), "utf8"),
  );
}

const GOLDEN_SETS = [
  "data/golden/golden-set.example.json",
  "data/golden/golden-set.draft.json",
] as const;

describe("contact sets", () => {
  for (const name of contactSetNames()) {
    it(`${name}: parses against the Contact schema`, () => {
      const contacts = loadContactSet(name);
      expect(contacts.length).toBeGreaterThanOrEqual(3);
    });

    it(`${name}: every contact can actually be sent to`, () => {
      for (const contact of loadContactSet(name)) {
        // A whatsapp contact with no phone, or an email contact with no
        // address, is a card whose send button can never work.
        if (contact.channel === "whatsapp") {
          expect(contact.phone, `${name}/${contact.id} needs a phone`).toBeTruthy();
        } else {
          expect(contact.email, `${name}/${contact.id} needs an email`).toBeTruthy();
        }
      }
    });

    it(`${name}: contact ids are unique`, () => {
      const ids = loadContactSet(name).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }
});

describe("golden sets", () => {
  for (const path of GOLDEN_SETS) {
    const cases = GoldenCase.array().parse(readJson(path));

    it(`${path}: parses, and has cases in every group it claims`, () => {
      expect(cases.length).toBeGreaterThanOrEqual(8);
      const groups = new Set(cases.map((c) => c.group));
      expect(groups.size).toBeGreaterThanOrEqual(4);
    });

    it(`${path}: case ids are unique`, () => {
      const ids = cases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it(`${path}: every referenced contact set exists`, () => {
      for (const testCase of cases) {
        expect(() => loadContactSet(testCase.contactSet)).not.toThrow();
      }
    });

    it(`${path}: every named contact exists in that case's set`, () => {
      for (const testCase of cases) {
        const ids = new Set(loadContactSet(testCase.contactSet).map((c) => c.id));
        const named = [
          ...testCase.expectedRecipients,
          ...Object.keys(testCase.mustKnow),
          ...Object.keys(testCase.blocked),
          ...Object.keys(testCase.expectedLanguage),
        ];
        for (const id of named) {
          expect(ids, `${testCase.id} names unknown contact ${id}`).toContain(id);
        }
      }
    });

    it(`${path}: no fact is both must-know and blocked for the same person`, () => {
      for (const testCase of cases) {
        for (const [contactId, blocked] of Object.entries(testCase.blocked)) {
          const mustKnow = testCase.mustKnow[contactId] ?? [];
          for (const item of blocked) {
            expect(
              mustKnow,
              `${testCase.id}: "${item}" is both required and forbidden for ${contactId}`,
            ).not.toContain(item);
          }
        }
      }
    });

    it(`${path}: every expected recipient has an expected language`, () => {
      for (const testCase of cases) {
        for (const id of testCase.expectedRecipients) {
          expect(
            Object.keys(testCase.expectedLanguage),
            `${testCase.id}: ${id} is expected to get a message but has no expected language`,
          ).toContain(id);
        }
      }
    });

    it(`${path}: spokenOn is a real date`, () => {
      for (const testCase of cases) {
        const parsed = new Date(`${testCase.spokenOn}T00:00:00.000Z`);
        expect(Number.isNaN(parsed.getTime()), `${testCase.id}`).toBe(false);
      }
    });

    it(`${path}: a case expecting nobody carries no expectations`, () => {
      for (const testCase of cases) {
        if (testCase.expectedRecipients.length > 0) continue;
        // "Concerns nobody" cases are the ones a padded recipient list fails.
        // They must not also assert must-know facts, or they are untestable.
        expect(Object.keys(testCase.mustKnow), `${testCase.id}`).toEqual([]);
      }
    });
  }
});

describe("the provisional set is fit to build against", () => {
  const cases = GoldenCase.array().parse(
    readJson("data/golden/golden-set.draft.json"),
  );

  it("has at least 8 real-shaped cases", () => {
    expect(cases.filter((c) => c.group === "real").length).toBeGreaterThanOrEqual(8);
  });

  it("keeps all four adversarial cases", () => {
    expect(cases.filter((c) => c.group === "adversarial").length).toBe(4);
  });

  it("exercises the Privacy Shield in more than one case", () => {
    const withBlocks = cases.filter((c) => Object.keys(c.blocked).length > 0);
    expect(withBlocks.length).toBeGreaterThanOrEqual(4);
  });

  it("includes a case that concerns nobody", () => {
    expect(cases.some((c) => c.expectedRecipients.length === 0)).toBe(true);
  });

  it("covers Devanagari, Hinglish and a non-Indian language", () => {
    const languages = cases
      .flatMap((c) => Object.values(c.expectedLanguage))
      .join(" | ")
      .toLowerCase();
    expect(languages).toContain("devanagari");
    expect(languages).toContain("hinglish");
    expect(languages).toMatch(/spanish|portuguese|taglish/);
  });
});
