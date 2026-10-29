import { describe, expect, it } from "vitest";
import {
  addDays,
  nextWeekday,
  resolveRelativeDates,
  spellOut,
} from "@/lib/dates";
import { dominantScript, requestedScript, scriptsIn } from "@/lib/script";
import { anonymise, scrub } from "@/lib/scrub";
import { countWords, voiceReturn } from "@/lib/voice-return";
import type { Draft } from "@/lib/types";

// 2026-10-29 is a Thursday.
const THURSDAY = "2026-10-29";

describe("relative dates", () => {
  it("resolves English relative days", () => {
    const found = resolveRelativeDates("we ship tomorrow", THURSDAY);
    expect(found.find((d) => d.phrase === "tomorrow")?.iso).toBe("2026-10-30");
  });

  it("resolves Hinglish relative days", () => {
    const found = resolveRelativeDates("kal bhej dena, parso tak pakka", THURSDAY);
    expect(found.find((d) => d.phrase === "kal")?.iso).toBe("2026-10-30");
    expect(found.find((d) => d.phrase === "parso")?.iso).toBe("2026-10-31");
  });

  it("reads a bare weekday as the coming one", () => {
    expect(resolveRelativeDates("delivery on Monday", THURSDAY)[0]?.iso).toBe("2026-11-02");
  });

  it("reads 'next Monday' as a week out from the coming Monday", () => {
    expect(resolveRelativeDates("delivery next Monday", THURSDAY)[0]?.iso).toBe("2026-11-02");
  });

  it("pushes 'next Thursday' past today when today is Thursday", () => {
    expect(nextWeekday(THURSDAY, "thursday")).toBe("2026-11-05");
  });

  it("handles 'agle' as a Hinglish 'next'", () => {
    expect(resolveRelativeDates("agle Monday", THURSDAY)[0]?.iso).toBe("2026-11-02");
  });

  it("crosses a month boundary", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("spells a date out so the speaker can check it", () => {
    expect(spellOut("2026-11-02")).toBe("Monday 2 November");
  });
});

describe("script detection", () => {
  it("names the dominant script", () => {
    expect(dominantScript("डिलीवरी सोमवार")).toBe("devanagari");
    expect(dominantScript("Delivery Monday")).toBe("latin");
  });

  it("reports mixed scripts in order", () => {
    expect(scriptsIn("डिलीवरी Monday")).toContain("devanagari");
    expect(scriptsIn("डिलीवरी Monday")).toContain("latin");
  });

  it("reads Hinglish as Roman script, not Devanagari", () => {
    expect(requestedScript("Hinglish")).toBe("latin");
    expect(requestedScript("Hindi, Devanagari")).toBe("devanagari");
    expect(requestedScript("Hindi in Roman script")).toBe("latin");
  });

  it("returns null for a language it does not recognise", () => {
    expect(requestedScript("Konkani")).toBeNull();
  });

  it("handles the global contact set's languages", () => {
    expect(requestedScript("Mexican Spanish, informal")).toBe("latin");
    expect(requestedScript("Brazilian Portuguese, neutral")).toBe("latin");
    expect(requestedScript("Taglish, Roman script")).toBe("latin");
  });
});

describe("output scrub", () => {
  it("hides a spoken OTP", () => {
    const result = scrub("the OTP is 448213, use it now");
    expect(result.text).not.toContain("448213");
    expect(result.masked.map((m) => m.kind)).toContain("otp");
  });

  it("hides a card number", () => {
    const result = scrub("card 4111 1111 1111 1111 on file");
    expect(result.text).not.toContain("4111 1111");
  });

  it("hides an Aadhaar-shaped id", () => {
    expect(scrub("id 1234 5678 9012").text).not.toContain("1234 5678 9012");
  });

  it("leaves an ordinary update untouched", () => {
    const text = "Delivery moves to Monday, 250 cartons short";
    expect(scrub(text).text).toBe(text);
    expect(scrub(text).masked).toHaveLength(0);
  });

  it("anonymises phone numbers and emails for the proof page", () => {
    const out = anonymise("call +91 90000 00001 or mail anita@example.com");
    expect(out).not.toContain("90000");
    expect(out).not.toContain("anita@example.com");
  });
});

describe("voice return", () => {
  function draft(body: string, contactId: string): Draft {
    return {
      contactId,
      channel: "whatsapp",
      subject: null,
      body,
      usedFactIds: [],
      sentences: [],
    };
  }

  it("counts words spoken and delivered", () => {
    expect(countWords("  one two   three ")).toBe(3);
    expect(countWords("")).toBe(0);
  });

  it("counts distinct languages, not contacts", () => {
    const result = voiceReturn({
      spokenText: "one two three four",
      drafts: [draft("a b", "c1"), draft("c d", "c2"), draft("e f", "c3")],
      languagesByContactId: {
        c1: "Hindi, Devanagari",
        c2: "hindi (devanagari script)",
        c3: "English",
      },
      baselineMinutesPerUpdate: null,
      actualSeconds: null,
    });
    expect(result.people).toBe(3);
    expect(result.languages).toBe(2);
  });

  it("reports minutes saved as null until a baseline exists", () => {
    const result = voiceReturn({
      spokenText: "one two",
      drafts: [draft("a b c", "c1")],
      languagesByContactId: { c1: "English" },
      baselineMinutesPerUpdate: null,
      actualSeconds: 40,
    });
    expect(result.minutesSaved).toBeNull();
  });

  it("computes minutes saved from a measured baseline", () => {
    const result = voiceReturn({
      spokenText: "one two",
      drafts: [draft("a b c", "c1")],
      languagesByContactId: { c1: "English" },
      baselineMinutesPerUpdate: 12,
      actualSeconds: 90,
    });
    expect(result.minutesSaved).toBe(10.5);
  });

  it("never reports negative minutes saved", () => {
    const result = voiceReturn({
      spokenText: "one",
      drafts: [draft("a", "c1")],
      languagesByContactId: { c1: "English" },
      baselineMinutesPerUpdate: 1,
      actualSeconds: 600,
    });
    expect(result.minutesSaved).toBe(0);
  });
});
