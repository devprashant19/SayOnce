import "server-only";
import demoUpdates from "@/data/demo/updates.json";
import { getCachedDemoResult } from "./demo-cache";

/**
 * The figures the landing page shows are computed from the prepared sample
 * fan-out that the same page demonstrates, so each one is arithmetic over data
 * in the repo rather than a number typed into markup. Anything that needs a
 * measurement we have not taken — a time saving needs a timed baseline — does
 * not belong here. See docs/rules/R0-HARD-RULES.md and `/proof`.
 */

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Hindi and Hinglish differ by script, so the script is part of the identity. */
function languageKey(language: string): string {
  return language.trim().toLowerCase();
}

export interface LandingSample {
  spokenWords: number;
  deliveredWords: number;
  recipients: number;
  /** Distinct language-and-script combinations across the drafts. */
  languages: number;
  /** Facts the speaker locked away from at least one recipient. */
  withheld: number;
}

export function landingSample(): LandingSample | null {
  const first = (demoUpdates as Array<{ id: string }>)[0];
  if (!first) return null;
  const result = getCachedDemoResult(first.id);
  if (!result) return null;

  const drafted = result.cards.filter((card) => card.draft !== null);
  if (drafted.length === 0) return null;

  const spokenWords = countWords(result.spokenText);
  const deliveredWords = drafted.reduce(
    (total, card) =>
      total + countWords(`${card.draft!.subject ?? ""} ${card.draft!.body}`),
    0,
  );
  if (spokenWords === 0) return null;

  return {
    spokenWords,
    deliveredWords,
    recipients: drafted.length,
    languages: new Set(drafted.map((c) => languageKey(c.contact.language))).size,
    withheld: result.facts.filter((f) => f.privacy.blockedFor.length > 0).length,
  };
}
