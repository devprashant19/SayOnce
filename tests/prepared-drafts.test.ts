import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkDraft } from "@/lib/checker";
import type { Contact, Draft, Fact } from "@/lib/types";

/**
 * The prepared fan-outs are what a judge sees first, and what instant mode
 * shows. They were checked when they were recorded; a checker made stricter
 * since must not now disagree with a "Facts verified" badge on screen.
 */
interface Card {
  contact: Contact;
  draft: Draft | null;
  check: { ok: boolean } | null;
}
interface Prepared {
  updateId: string;
  facts: Fact[];
  cards: Card[];
  routing?: { decisions?: Array<{ contactId: string; factIds: string[] }> };
}

const prepared = JSON.parse(
  readFileSync(join(process.cwd(), "data", "demo", "cached-results.json"), "utf8"),
) as Record<string, Prepared>;

describe("every prepared draft still passes the checker", () => {
  // Each result is stored under its sample id and its spoken text.
  const seen = new Set<string>();
  for (const [key, result] of Object.entries(prepared)) {
    if (seen.has(result.updateId) || !Array.isArray(result.cards)) continue;
    seen.add(result.updateId);
    it(`${key.slice(0, 40)}`, () => {
      for (const card of result.cards) {
        if (!card.draft || !card.check?.ok) continue;
        const routed = result.routing?.decisions?.find((d) => d.contactId === card.contact.id)?.factIds ?? [];
        const ids = new Set([...routed, ...card.draft.usedFactIds]);
        const outcome = checkDraft({
          draft: card.draft,
          contact: card.contact,
          allowedFacts: result.facts.filter((f) => ids.has(f.id)),
          allFacts: result.facts,
        });
        expect(outcome.failures, `${card.contact.name}: ${card.draft.body.slice(0, 60)}`).toEqual([]);
      }
    });
  }
});
