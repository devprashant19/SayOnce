import { describe, expect, it } from "vitest";
import { checkDraft, factsForContact, mustKnowCoverage } from "@/lib/checker";
import type { Contact, Draft, Fact } from "@/lib/types";

function fact(overrides: Partial<Fact> & Pick<Fact, "id" | "text">): Fact {
  return {
    type: "status",
    values: { numbers: [], datesIso: [], names: [] },
    sourceSpan: { start: 0, end: overrides.text.length },
    privacy: { blockedFor: [], reason: "" },
    ...overrides,
  };
}

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c_vendor",
    name: "Ramesh",
    role: "Packaging vendor",
    relationship: "our supplier",
    language: "Hinglish, Roman script",
    channel: "whatsapp",
    phone: "+919000000001",
    email: null,
    formality: "neutral",
    caresAbout: "quantities and dates",
    neverTell: [],
    ...overrides,
  };
}

function draft(overrides: Partial<Draft> & Pick<Draft, "body">): Draft {
  return {
    contactId: "c_vendor",
    channel: "whatsapp",
    subject: null,
    usedFactIds: [],
    sentences: [],
    ...overrides,
  };
}

const DELIVERY = fact({
  id: "f1",
  text: "Delivery moves to Monday 2 November",
  type: "date",
  values: { numbers: [], datesIso: ["2026-11-02"], names: [] },
});

const SHORTFALL = fact({
  id: "f2",
  text: "Ramesh sent only 250 cartons of the 400 needed",
  type: "quantity",
  values: { numbers: ["250", "400"], datesIso: [], names: ["Ramesh"] },
});

describe("invented facts", () => {
  it("passes a draft that only uses granted numbers", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Ramesh bhai, 250 cartons aaye, 400 chahiye the. Baaki 150 bhejo." }),
      contact: contact(),
      allowedFacts: [SHORTFALL, fact({ id: "f3", text: "150 cartons still outstanding", values: { numbers: ["150"], datesIso: [], names: [] } })],
      allFacts: [SHORTFALL],
    });
    expect(outcome.ok).toBe(true);
  });

  it("catches a number nobody said", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Ramesh bhai, 250 cartons aaye. 500 ka naya order bhi bhej do." }),
      contact: contact(),
      allowedFacts: [SHORTFALL],
      allFacts: [SHORTFALL],
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.failures.map((f) => f.code)).toContain("invented-number");
    expect(outcome.failures.find((f) => f.code === "invented-number")?.evidence).toBe("500");
  });

  it("does not treat the English verb 'do not' or Hindi verb 'bhej do' as the numeral 2", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Please do not test build 41 yet. Bhej do." }),
      contact: contact(),
      allowedFacts: [fact({ id: "f41", text: "Do not test build 41", values: { numbers: ["41"], datesIso: [], names: [] } })],
      allFacts: [fact({ id: "f41", text: "Do not test build 41", values: { numbers: ["41"], datesIso: [], names: [] } })],
    });
    expect(outcome.failures.map((f) => f.code)).not.toContain("invented-number");
  });

  it("treats a number spoken in words as the same quantity", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Ramesh bhai, two hundred fifty cartons aaye hain." }),
      contact: contact(),
      allowedFacts: [SHORTFALL],
      allFacts: [SHORTFALL],
    });
    // "two" -> 2 and "hundred" -> 100 are not granted, so this is still caught.
    expect(outcome.ok).toBe(false);
  });

  it("catches a date nobody said", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Delivery 2026-11-02 pe hai. Pickup 2026-11-05 ko karna." }),
      contact: contact(),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("invented-date");
  });

  it("catches a name nobody said", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Ramesh bhai, Suresh ne bola 250 cartons kaafi hain." }),
      contact: contact(),
      allowedFacts: [SHORTFALL],
      allFacts: [SHORTFALL],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("invented-name");
  });

  it("lets a draft address the person it is written to", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Hi Ramesh, 250 cartons received, 400 needed. Thanks." }),
      contact: contact({ name: "Ramesh" }),
      allowedFacts: [SHORTFALL],
      allFacts: [SHORTFALL],
    });
    expect(outcome.ok).toBe(true);
  });

  it("does not flag weekday or month names as invented people", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Hi Ramesh, delivery moves to Monday 2 November." }),
      contact: contact({ name: "Ramesh" }),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).not.toContain("invented-name");
  });

  it("does not flag sign-off closings like Best, Cheers, Sincerely as invented people", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Hi Ramesh, delivery moves to Monday 2 November.\n\nBest,\nCheers,\nSincerely, Team" }),
      contact: contact({ name: "Ramesh" }),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).not.toContain("invented-name");
  });
});

describe("privacy shield", () => {
  const SECRET = fact({
    id: "f9",
    text: "The vendor shorted us and that caused the delay",
    privacy: { blockedFor: ["c_client"], reason: "don't tell the client it was the vendor" },
  });

  it("blocks a draft that leaks a withheld fact", () => {
    const outcome = checkDraft({
      draft: draft({
        contactId: "c_client",
        channel: "email",
        subject: "Revised schedule",
        body: "The vendor shorted us and that caused the delay, so delivery moves.",
      }),
      contact: contact({ id: "c_client", name: "Priya", channel: "email", email: "p@example.com", language: "English" }),
      allowedFacts: [],
      allFacts: [SECRET],
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.failures.map((f) => f.code)).toContain("blocked-fact-leak");
  });

  it("passes a draft that withholds it properly", () => {
    const outcome = checkDraft({
      draft: draft({
        contactId: "c_client",
        channel: "email",
        subject: "Revised schedule",
        body: "Hello Priya, the schedule has been revised. Thanks.",
      }),
      contact: contact({ id: "c_client", name: "Priya", channel: "email", email: "p@example.com", language: "English" }),
      allowedFacts: [],
      allFacts: [SECRET],
    });
    expect(outcome.ok).toBe(true);
  });

  it("catches a leak by a withheld number alone", () => {
    const numeric = fact({
      id: "f10",
      text: "Our margin on this order is 18 percent",
      values: { numbers: ["18"], datesIso: [], names: [] },
      privacy: { blockedFor: ["c_vendor"], reason: "never tell the vendor our margins" },
    });
    const outcome = checkDraft({
      draft: draft({ body: "Ramesh bhai, 18 percent par baat karni hai." }),
      contact: contact(),
      allowedFacts: [],
      allFacts: [numeric],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("blocked-fact-leak");
  });
});

describe("language and script", () => {
  it("fails a Devanagari contact who got Latin script", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Delivery moves to Monday." }),
      contact: contact({ id: "c_wh", name: "Suresh", language: "Hindi, Devanagari" }),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("wrong-script");
  });

  it("passes Hinglish written in Roman script", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Delivery Monday ko shift ho gayi hai." }),
      contact: contact({ language: "Hinglish, Roman script" }),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).not.toContain("wrong-script");
  });

  it("passes Devanagari for a Devanagari contact", () => {
    const outcome = checkDraft({
      draft: draft({ body: "डिलीवरी सोमवार को होगी।" }),
      contact: contact({ id: "c_wh", name: "Suresh", language: "Hindi, Devanagari" }),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).not.toContain("wrong-script");
  });

  it("does not invent a script requirement for a language it does not know", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Delivery Monday." }),
      contact: contact({ language: "Konkani, whatever script he prefers" }),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).not.toContain("wrong-script");
  });
});

describe("channel fit", () => {
  it("requires a subject on email", () => {
    const outcome = checkDraft({
      draft: draft({ channel: "email", subject: "", body: "Delivery moves to Monday." }),
      contact: contact({ channel: "email", email: "a@example.com", language: "English" }),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("missing-subject");
  });

  it("rejects a WhatsApp body that is too long", () => {
    const outcome = checkDraft({
      draft: draft({ body: `Delivery Monday. ${"x".repeat(800)}` }),
      contact: contact(),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("body-too-long");
  });

  it("rejects markdown WhatsApp would show literally", () => {
    const outcome = checkDraft({
      draft: draft({ body: "## Update\n- Delivery Monday" }),
      contact: contact(),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("markdown-in-whatsapp");
  });

  it("rejects an empty draft outright", () => {
    const outcome = checkDraft({
      draft: draft({ body: "   " }),
      contact: contact(),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.failures[0]?.code).toBe("empty-body");
  });
});

describe("fact claims", () => {
  it("catches a draft claiming a fact it was never given", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Delivery Monday.", usedFactIds: ["f1", "f99"] }),
      contact: contact(),
      allowedFacts: [DELIVERY],
      allFacts: [DELIVERY],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("unused-fact-claimed");
  });
});

describe("factsForContact", () => {
  it("never returns a fact blocked for that contact, even if routed", () => {
    const secret = fact({
      id: "f5",
      text: "internal only",
      privacy: { blockedFor: ["c_vendor"], reason: "internal" },
    });
    const result = factsForContact([DELIVERY, secret], "c_vendor", ["f1", "f5"]);
    expect(result.map((f) => f.id)).toEqual(["f1"]);
  });
});

describe("mustKnowCoverage", () => {
  it("counts a correctly paraphrased fact as covered", () => {
    const { covered, missing } = mustKnowCoverage(
      "Delivery has moved to Monday the 2nd of November.",
      ["delivery moved to Monday 2 November"],
    );
    expect(covered).toHaveLength(1);
    expect(missing).toHaveLength(0);
  });

  it("reports a fact that is simply absent", () => {
    const { missing } = mustKnowCoverage("Everything is on track.", [
      "delivery moved to Monday 2 November",
    ]);
    expect(missing).toHaveLength(1);
  });
});

describe("the draft greets the person it is written to", () => {
  // Production, 30 Oct: the update said "Kabir, hold the courier booking".
  // Kabir is not on the roster, routing gave the instruction to Imran, and the
  // draft to Imran opened "Kabir, courier booking hold kar do" — and passed,
  // because a name at the start of a sentence is skipped, and Kabir was in
  // the facts.
  const COURIER = fact({
    id: "f5",
    text: "Kabir, hold the courier booking until Saturday",
    values: { numbers: [], datesIso: [], names: ["Kabir"] },
  });
  const imran = contact({ id: "c_ops", name: "Imran Shaikh", role: "Ops coordinator" });

  it("blocks a draft addressed to someone else by name", () => {
    const outcome = checkDraft({
      draft: draft({ contactId: "c_ops", body: "Kabir, courier booking hold kar do Saturday tak. Thanks." }),
      contact: imran,
      allowedFacts: [COURIER],
      allFacts: [COURIER],
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.failures.map((f) => f.code)).toContain("wrong-recipient");
    expect(outcome.failures.find((f) => f.code === "wrong-recipient")?.evidence).toBe("Kabir");
  });

  it("catches it after a salutation too", () => {
    const outcome = checkDraft({
      draft: draft({ contactId: "c_ops", channel: "email", subject: "Courier", body: "Dear Kabir,\n\nPlease hold the courier booking until Saturday." }),
      contact: imran,
      allowedFacts: [COURIER],
      allFacts: [COURIER],
    });
    expect(outcome.failures.map((f) => f.code)).toContain("wrong-recipient");
  });

  it("passes the recipient's own first or last name, with or without an honorific", () => {
    for (const body of ["Imran, courier hold kar do.", "Dear Imran Shaikh,\n\nHold the courier.", "Imran bhai, hold kar do.", "Hi Shaikh ji, hold kar do."]) {
      const outcome = checkDraft({ draft: draft({ contactId: "c_ops", body }), contact: imran, allowedFacts: [COURIER], allFacts: [COURIER] });
      expect(outcome.failures.map((f) => f.code), body).not.toContain("wrong-recipient");
    }
  });

  it("does not mistake a greeting word or an opening word for a name", () => {
    for (const body of ["Hi team, courier hold kar do.", "Namaste, courier hold kar do.", "Baaki, courier hold kar do Saturday tak.", "Hello all, hold the courier."]) {
      const outcome = checkDraft({ draft: draft({ contactId: "c_ops", body }), contact: imran, allowedFacts: [COURIER], allFacts: [COURIER] });
      expect(outcome.failures.map((f) => f.code), body).not.toContain("wrong-recipient");
    }
  });
});

describe("a capitalised word you actually said is not an invented name", () => {
  // Lab, 30 Oct: "Phase two starts Monday" was blocked as inventing a person
  // called "phase", though the fact said "phase two starts Monday".
  const PHASE = fact({ id: "f1", text: "phase two starts Monday 2 November", values: { numbers: ["2"], datesIso: ["2026-11-02"], names: [] } });

  it("passes a sentence that capitalises a word from the facts", () => {
    const outcome = checkDraft({
      draft: draft({ contactId: "c_client", channel: "email", subject: "Next phase", body: "Hi Ramesh,\n\nThe next step is set, and Phase two starts Monday 2 November." }),
      contact: contact({ id: "c_client", channel: "email", email: "r@example.com" }),
      allowedFacts: [PHASE],
      allFacts: [PHASE],
    });
    expect(outcome.failures.map((f) => f.code)).not.toContain("invented-name");
  });

  it("still blocks a name nobody said", () => {
    const outcome = checkDraft({
      draft: draft({ body: "Ramesh bhai, phase two Monday se, aur Suresh bhi aayega." }),
      contact: contact(),
      allowedFacts: [PHASE],
      allFacts: [PHASE],
    });
    expect(outcome.failures.map((f) => f.evidence)).toContain("suresh");
  });
});
