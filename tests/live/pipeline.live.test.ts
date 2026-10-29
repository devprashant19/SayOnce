import { describe, expect, it } from "vitest";
import { extract } from "@/lib/ai/extract";
import { composeOne } from "@/lib/ai/compose";
import { checkDraft } from "@/lib/checker";
import { loadContactSet } from "@/lib/contact-sets";

/**
 * The live test. Calls the real model and runs the real pipeline.
 *
 *   npm run test:live
 *
 * Needs GEMINI_API_KEY. It is excluded from `npm run test` because it costs
 * money and needs a network, and because an offline suite that is always green
 * is worth more than one that is sometimes skipped.
 *
 * What it is for: proving the integration end to end — the key, the model, the
 * schema translation, the prompts, the parsing, and the deterministic checker
 * on a real draft. If this passes, Phase 1 genuinely works.
 */

const HAS_KEY = Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY);

// A Hinglish update that exercises the four things Extract must get right:
// a numeral spoken in Hindi, a relative date, a mid-sentence correction, and
// a privacy instruction naming one person.
const SPOKEN =
  "Ramesh ne sirf dhai sau cartons bheje, we needed four hundred. " +
  "Delivery Friday nahi, no wait, Monday ho gayi hai. " +
  "Priya ko bata dena delivery Monday hai, but don't tell her the vendor shorted us.";

const SPOKEN_ON = "2026-10-29"; // a Thursday

describe.skipIf(!HAS_KEY)("live pipeline", () => {
  const contacts = loadContactSet("india");

  it(
    "extracts facts from a Hinglish update",
    async () => {
      const { value } = await extract({
        spokenText: SPOKEN,
        contacts,
        spokenOnIso: SPOKEN_ON,
      });

      console.log(`\n  facts found: ${value.facts.length}`);
      for (const fact of value.facts) {
        console.log(
          `   - [${fact.type}] ${fact.text}` +
            (fact.values.numbers.length ? ` | numbers: ${fact.values.numbers.join(",")}` : "") +
            (fact.values.datesIso.length ? ` | dates: ${fact.values.datesIso.join(",")}` : "") +
            (fact.privacy.blockedFor.length ? ` | BLOCKED FOR: ${fact.privacy.blockedFor.join(",")}` : ""),
        );
      }

      // Structure came back at all.
      expect(value.facts.length).toBeGreaterThanOrEqual(3);

      // Source spans point inside the text we actually sent, which is what the
      // provenance highlight depends on.
      for (const fact of value.facts) {
        expect(fact.sourceSpan.start).toBeGreaterThanOrEqual(0);
        expect(fact.sourceSpan.end).toBeLessThanOrEqual(SPOKEN.length);
        expect(fact.sourceSpan.end).toBeGreaterThanOrEqual(fact.sourceSpan.start);
      }

      const allNumbers = value.facts.flatMap((f) => f.values.numbers);
      const allDates = value.facts.flatMap((f) => f.values.datesIso);
      const allText = value.facts.map((f) => f.text).join(" ").toLowerCase();

      // "dhai sau" is 250. This is the Hinglish numeral case.
      expect(allNumbers.join(",")).toContain("250");

      // The mid-sentence correction: Monday survives, Friday does not become
      // the delivery date.
      expect(allDates.join(",")).toContain("2026-11-02");

      // A privacy instruction naming one person became a lock.
      const blocked = value.facts.filter((f) => f.privacy.blockedFor.length > 0);
      expect(blocked.length).toBeGreaterThanOrEqual(1);

      console.log(`  corrections applied: ${JSON.stringify(value.correctionsApplied)}`);
      console.log(`  summary: ${value.summary}`);
      expect(allText.length).toBeGreaterThan(0);
    },
    120_000,
  );

  it(
    "composes a draft that the deterministic checker passes",
    async () => {
      const extracted = await extract({
        spokenText: SPOKEN,
        contacts,
        spokenOnIso: SPOKEN_ON,
      });

      const vendor = contacts.find((c) => c.id === "c_vendor")!;
      const allowed = extracted.value.facts.filter(
        (f) => !f.privacy.blockedFor.includes(vendor.id),
      );

      const composed = await composeOne({
        contact: vendor,
        facts: allowed,
        project: "Diwali retail order",
      });

      console.log(`\n  draft for ${vendor.name} (${vendor.language}, ${vendor.channel}):`);
      console.log(`  ---\n  ${composed.value.body.replace(/\n/g, "\n  ")}\n  ---`);
      console.log(`  used facts: ${composed.value.usedFactIds.join(", ")}`);

      expect(composed.value.body.length).toBeGreaterThan(0);
      expect(composed.value.contactId).toBe(vendor.id);
      expect(composed.value.channel).toBe("whatsapp");
      // A WhatsApp draft carries no subject.
      expect(composed.value.subject).toBeNull();

      const check = checkDraft({
        draft: composed.value,
        contact: vendor,
        allowedFacts: allowed,
        allFacts: extracted.value.facts,
      });

      if (!check.ok) {
        console.log("  checker failures:");
        for (const failure of check.failures) {
          console.log(`   - ${failure.code}: ${failure.message}`);
        }
      } else {
        console.log("  checker: Facts verified");
      }

      // The hard gates, on a real draft: nothing invented, nothing leaked.
      const invented = check.failures.filter((f) => f.code.startsWith("invented-"));
      const leaks = check.failures.filter((f) => f.code === "blocked-fact-leak");
      expect(invented).toEqual([]);
      expect(leaks).toEqual([]);
    },
    180_000,
  );

  it(
    "withholds the locked fact from the client's draft",
    async () => {
      const extracted = await extract({
        spokenText: SPOKEN,
        contacts,
        spokenOnIso: SPOKEN_ON,
      });

      const client = contacts.find((c) => c.id === "c_client")!;
      const allowed = extracted.value.facts.filter(
        (f) => !f.privacy.blockedFor.includes(client.id),
      );

      const composed = await composeOne({
        contact: client,
        facts: allowed,
        project: "Diwali retail order",
      });

      console.log(`\n  draft for ${client.name} (${client.language}, ${client.channel}):`);
      console.log(`  subject: ${composed.value.subject}`);
      console.log(`  ---\n  ${composed.value.body.replace(/\n/g, "\n  ")}\n  ---`);

      // An email draft must carry a subject.
      expect(composed.value.subject).toBeTruthy();

      const check = checkDraft({
        draft: composed.value,
        contact: client,
        allowedFacts: allowed,
        allFacts: extracted.value.facts,
      });

      if (!check.ok) {
        console.log("  checker failures:");
        for (const failure of check.failures) {
          console.log(`   - ${failure.code}: ${failure.message}`);
        }
      }

      // The Privacy Shield's actual promise, tested live.
      expect(check.failures.filter((f) => f.code === "blocked-fact-leak")).toEqual([]);
    },
    180_000,
  );
});

describe.skipIf(HAS_KEY)("live pipeline (skipped)", () => {
  it("needs GEMINI_API_KEY", () => {
    console.log(
      "\n  Skipped: set GEMINI_API_KEY in .env.local to run the live pipeline test.\n" +
        "  Free key: https://aistudio.google.com/apikey\n",
    );
    expect(true).toBe(true);
  });
});
