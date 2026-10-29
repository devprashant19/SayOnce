import { describe, expect, it } from "vitest";
import {
  decodeSendLink,
  mailtoLink,
  sendTargetFor,
  whatsappDigits,
  whatsappLink,
} from "@/lib/links";
import type { Draft } from "@/lib/types";

/**
 * Phase 3's round-trip table, as tests. A message that arrives in WhatsApp
 * with broken Devanagari or a truncated body is worse than no tool, and it is
 * exactly the kind of thing that only shows up on a real phone — so it is
 * checked byte for byte here first.
 */

const TRICKY: ReadonlyArray<readonly [string, string]> = [
  ["plain", "Delivery moves to Monday."],
  ["devanagari", "डिलीवरी सोमवार को होगी। कृपया तीन लोग भेजें।"],
  ["hinglish", "Ramesh bhai, 250 cartons aaye, baaki 150 parso tak bhej do."],
  ["line breaks", "Line one\nLine two\n\nLine four"],
  ["ampersand", "Pickup & dispatch both move"],
  ["hash and question", "#DIW-204 ready? Confirm by 6pm"],
  ["emoji", "Done ✅ 400 cartons out 🚚"],
  ["plus and equals", "Total = 250 + 150 cartons"],
  ["percent literal", "Margin discussion: 100% internal"],
  ["quotes", `He said "Monday" not 'Friday'`],
  ["spanish accents", "La entrega se mueve al lunes, ¿confirmas?"],
  ["portuguese", "A produção caiu para oito mil unidades em novembro."],
  ["long", `Delivery update. ${"detail ".repeat(60)}`],
];

describe("whatsappDigits", () => {
  it("strips the plus and separators", () => {
    expect(whatsappDigits("+91 90000 00001")).toBe("919000000001");
    expect(whatsappDigits("+52-55-0000-0001")).toBe("525500000001");
  });

  it("rejects a number that is not international", () => {
    expect(() => whatsappDigits("90001")).toThrow();
  });
});

describe("whatsapp link round trip", () => {
  for (const [label, body] of TRICKY) {
    it(`survives: ${label}`, () => {
      const href = whatsappLink("+919000000001", body);
      const decoded = decodeSendLink(href);
      expect(decoded.to).toBe("919000000001");
      expect(decoded.body).toBe(body);
    });
  }
});

describe("mailto link round trip", () => {
  for (const [label, body] of TRICKY) {
    it(`survives: ${label}`, () => {
      const subject = "Revised schedule — DIW-204";
      const href = mailtoLink("anita@example.com", subject, body);
      const decoded = decodeSendLink(href);
      expect(decoded.to).toBe("anita@example.com");
      expect(decoded.subject).toBe(subject);
      expect(decoded.body).toBe(body);
    });
  }

  it("uses CRLF line breaks in the encoded body", () => {
    const href = mailtoLink("a@example.com", "s", "one\ntwo");
    expect(href).toContain("%0D%0A");
  });

  it("encodes spaces as %20, not plus", () => {
    const href = mailtoLink("a@example.com", "two words", "three more words");
    expect(href).not.toContain("+");
    expect(href).toContain("%20");
  });
});

describe("sendTargetFor", () => {
  const base: Draft = {
    contactId: "c1",
    channel: "whatsapp",
    subject: null,
    body: "Delivery Monday.",
    usedFactIds: [],
    sentences: [],
  };

  it("explains itself when a WhatsApp contact has no phone", () => {
    const target = sendTargetFor(base, { name: "Ramesh", phone: null, email: null });
    expect(target.href).toBeNull();
    expect(target.blockedReason).toContain("no phone number");
  });

  it("explains itself when an email contact has no address", () => {
    const target = sendTargetFor(
      { ...base, channel: "email", subject: "Update" },
      { name: "Anita", phone: null, email: null },
    );
    expect(target.href).toBeNull();
    expect(target.blockedReason).toContain("no email address");
  });

  it("builds a usable WhatsApp link", () => {
    const target = sendTargetFor(base, {
      name: "Ramesh",
      phone: "+919000000001",
      email: null,
    });
    expect(target.href).toContain("https://wa.me/919000000001?text=");
    expect(target.blockedReason).toBeNull();
  });
});
