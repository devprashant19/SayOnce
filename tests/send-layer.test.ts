import { describe, expect, it } from "vitest";
import { whatsappLink, mailtoLink, decodeSendLink, sendTargetFor } from "@/lib/links";
import { checkDraft } from "@/lib/checker";
import { appendEntry, verifyChain, buildChain, GENESIS_HASH, type TrailEntryInput } from "@/lib/trail";
import type { Contact, Draft, Fact } from "@/lib/types";

const TRICKY_CASES = [
  {
    id: "case-01",
    name: "Devanagari text (Hindi)",
    phone: "+919000000012",
    email: "devendra@sayonce.example",
    subject: "वेबहुक एंडपॉइंट अपडेट",
    body: "नमस्ते देवेंद्र जी, वेबहुक एंडपॉइंट /api/v2/payments/webhook पर बदल दिया गया है। 250 कार्टन प्राप्त हो गए हैं।",
  },
  {
    id: "case-02",
    name: "Hinglish mixed script",
    phone: "+919000000011",
    email: "kabir@sayonce.example",
    subject: "Design missing update",
    body: "Kabir bhai, payments screen ke liye success screen ka design chahiye. Kal subah tak bhej dena please!",
  },
  {
    id: "case-03",
    name: "Emoji rich status update",
    phone: "+919000000001",
    email: "vendor@sayonce.example",
    subject: "Order Status 🚀📦",
    body: "🚀 Build 42 is live! 📦 250 cartons verified ✅ 150 cartons pending ⏳ Please confirm ETA 🙏",
  },
  {
    id: "case-04",
    name: "URLs, queries, anchors and slashes",
    phone: "+919000000012",
    email: "devendra@sayonce.example",
    subject: "Endpoint config: /api/v2/webhook",
    body: "Please test endpoint: https://api.example.com/v2/callback?status=success&token=xyz#overview directly.",
  },
  {
    id: "case-05",
    name: "Special characters: & # ? = % + @",
    phone: "+919000000013",
    email: "anjali@sayonce.example",
    subject: "QA Test #41: Status 100% & QA Pass?",
    body: "Formula: A+B = C & Margin% = 18%. Code #41? Total $500 & €400 + taxes. Contact: support@sayonce.example.",
  },
  {
    id: "case-06",
    name: "Devanagari with multiple line breaks",
    phone: "+919000000012",
    email: "devendra@sayonce.example",
    subject: "लाइन ब्रेक टेस्ट",
    body: "पहला बिंदु: काम पूरा हुआ।\n\nदूसरा बिंदु: नया बिल्ड आ रहा है।\n\nतीसरा बिंदु: सोमवार को डिलीवरी है।\n\n सादर,\nप्रशांत",
  },
  {
    id: "case-07",
    name: "Quotes, double quotes and apostrophes",
    phone: "+919000000011",
    email: "meera@sayonce.example",
    subject: "Client's \"Urgent\" Feedback",
    body: 'Meera said: "We won\'t accept any delays." The designer\'s revision is "in progress" and won\'t take long.',
  },
  {
    id: "case-08",
    name: "Long WhatsApp message near character limit (~550 chars)",
    phone: "+919000000001",
    email: "vendor@sayonce.example",
    subject: "Comprehensive vendor delivery update",
    body: "Dear Ramesh, here is the detailed breakdown for this week's dispatch. Batch 1 of 250 units arrived safely at the warehouse today and passed inspection. Batch 2 of 150 units is expected on Thursday 5 November before 2 PM. Please ensure the transport documentation is attached to the invoice. If there are any delays with the carrier, alert us immediately so we can adjust our distribution schedule accordingly. Thank you for your continued support and coordination on this project.",
  },
  {
    id: "case-09",
    name: "US E.164 phone number (+1)",
    phone: "+12025550123",
    email: "alex@sayonce.example",
    subject: "US team sync update",
    body: "Hi Alex, milestone 2 is confirmed for Friday. All payments screen tests passed with zero blockers.",
  },
  {
    id: "case-10",
    name: "Mexican E.164 phone number (+52)",
    phone: "+525500000001",
    email: "carlos@sayonce.example",
    subject: "Actualización de proyecto",
    body: "Hola Carlos, la integración de pagos estará lista para la demo el jueves. Por favor revisa los endpoints.",
  },
  {
    id: "case-11",
    name: "Indian comma numbers & currency formatting",
    phone: "+919000000011",
    email: "accounts@sayonce.example",
    subject: "Payment invoice revision #CR-2026",
    body: "Revised invoice total is ₹2,50,000.50 (two lakh fifty thousand). Advance of ₹1,00,000 received. Balance ₹1,50,000.50 due on delivery.",
  },
  {
    id: "case-12",
    name: "Multilingual accents (Spanish & Portuguese)",
    phone: "+5511900000001",
    email: "lucas@sayonce.example",
    subject: "Atualização e confirmação de entrega",
    body: "Olá Lucas! A versão com suporte a várias moedas será entregue até às 15:00 de amanhã. Obrigado pelo apoio!",
  },
];

describe("Phase 3: 12 Tricky Link Round-Trips", () => {
  for (const tc of TRICKY_CASES) {
    it(`round-trips ${tc.name} byte-for-byte`, () => {
      // 1. WhatsApp link round-trip
      const waLink = whatsappLink(tc.phone, tc.body);
      const decodedWa = decodeSendLink(waLink);
      const expectedDigits = tc.phone.replace(/\D/g, "");

      expect(decodedWa.to).toBe(expectedDigits);
      expect(decodedWa.body).toBe(tc.body);

      // 2. Mailto link round-trip
      const mailLink = mailtoLink(tc.email, tc.subject, tc.body);
      const decodedMail = decodeSendLink(mailLink);

      expect(decodedMail.to).toBe(tc.email);
      expect(decodedMail.subject).toBe(tc.subject);
      expect(decodedMail.body).toBe(tc.body);
    });
  }
});

describe("Phase 3: Channel Limits and Formatting Rules", () => {
  const dummyContact: Contact = {
    id: "c_test",
    name: "Test User",
    role: "Tester",
    relationship: "colleague",
    language: "English",
    channel: "whatsapp",
    phone: "+919000000001",
    email: "test@example.com",
    formality: "neutral",
    caresAbout: "testing",
    neverTell: [],
  };

  it("flags WhatsApp message exceeding 700 characters", () => {
    const longBody = "A".repeat(701);
    const draft: Draft = {
      contactId: "c_test",
      channel: "whatsapp",
      subject: null,
      body: longBody,
      usedFactIds: [],
      sentences: [],
    };

    const outcome = checkDraft({
      draft,
      contact: dummyContact,
      allowedFacts: [],
      allFacts: [],
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.failures.some((f) => f.code === "body-too-long")).toBe(true);
  });

  it("flags WhatsApp message containing markdown heading or list", () => {
    const draftHeading: Draft = {
      contactId: "c_test",
      channel: "whatsapp",
      subject: null,
      body: "## Heading\nPlain text here.",
      usedFactIds: [],
      sentences: [],
    };

    const outcome1 = checkDraft({
      draft: draftHeading,
      contact: dummyContact,
      allowedFacts: [],
      allFacts: [],
    });
    expect(outcome1.ok).toBe(false);
    expect(outcome1.failures.some((f) => f.code === "markdown-in-whatsapp")).toBe(true);

    const draftBullets: Draft = {
      contactId: "c_test",
      channel: "whatsapp",
      subject: null,
      body: "Items:\n- item 1\n- item 2",
      usedFactIds: [],
      sentences: [],
    };
    const outcome2 = checkDraft({
      draft: draftBullets,
      contact: dummyContact,
      allowedFacts: [],
      allFacts: [],
    });
    expect(outcome2.ok).toBe(false);
    expect(outcome2.failures.some((f) => f.code === "markdown-in-whatsapp")).toBe(true);
  });

  it("flags email missing subject or subject over 70 characters", () => {
    const emailContact: Contact = {
      ...dummyContact,
      channel: "email",
    };

    const draftEmptySubject: Draft = {
      contactId: "c_test",
      channel: "email",
      subject: "",
      body: "Valid body text here.",
      usedFactIds: [],
      sentences: [],
    };

    const outcomeEmpty = checkDraft({
      draft: draftEmptySubject,
      contact: emailContact,
      allowedFacts: [],
      allFacts: [],
    });
    expect(outcomeEmpty.ok).toBe(false);
    expect(outcomeEmpty.failures.some((f) => f.code === "missing-subject")).toBe(true);

    const draftLongSubject: Draft = {
      contactId: "c_test",
      channel: "email",
      subject: "A".repeat(71),
      body: "Valid body text here.",
      usedFactIds: [],
      sentences: [],
    };

    const outcomeLong = checkDraft({
      draft: draftLongSubject,
      contact: emailContact,
      allowedFacts: [],
      allFacts: [],
    });
    expect(outcomeLong.ok).toBe(false);
    expect(outcomeLong.failures.some((f) => f.code === "subject-too-long")).toBe(true);
  });
});

describe("Phase 3: Send Target Missing Channel Details", () => {
  it("provides informative blockedReason when phone is missing for WhatsApp", () => {
    const draft: Draft = {
      contactId: "c_no_phone",
      channel: "whatsapp",
      subject: null,
      body: "Hello",
      usedFactIds: [],
      sentences: [],
    };
    const target = sendTargetFor(draft, { name: "Ramesh", phone: null, email: "ramesh@example.com" });
    expect(target.href).toBeNull();
    expect(target.blockedReason).toContain("has no phone number yet");
  });

  it("provides informative blockedReason when email is missing for Email", () => {
    const draft: Draft = {
      contactId: "c_no_email",
      channel: "email",
      subject: "Update",
      body: "Hello",
      usedFactIds: [],
      sentences: [],
    };
    const target = sendTargetFor(draft, { name: "Priya", phone: "+919000000001", email: null });
    expect(target.href).toBeNull();
    expect(target.blockedReason).toContain("has no email address yet");
  });
});

describe("Phase 3: Trust Trail Sent Entry Chaining", () => {
  it("appends sent entry and maintains valid hash chain", () => {
    const updateId = "u_send_test";
    const initialInputs: TrailEntryInput[] = [
      {
        updateId,
        seq: 1,
        at: "2026-10-29T10:00:00.000Z",
        actor: "user",
        type: "spoken",
        payload: { text: "Order 42 ready" },
      },
      {
        updateId,
        seq: 2,
        at: "2026-10-29T10:00:02.000Z",
        actor: "ai",
        type: "extracted",
        payload: { factIds: ["f1"] },
      },
    ];

    const chain = buildChain(initialInputs);
    expect(verifyChain(chain).ok).toBe(true);

    // Append 'sent' entry
    const last = chain[chain.length - 1]!;
    const sentEntry = appendEntry(
      {
        updateId,
        seq: last.seq + 1,
        at: "2026-10-29T10:01:00.000Z",
        actor: "user",
        type: "sent",
        payload: {
          messageId: "m_01",
          contactId: "c_vendor",
          channel: "whatsapp",
          sentAt: "2026-10-29T10:01:00.000Z",
        },
      },
      last.hash,
    );

    const updatedChain = [...chain, sentEntry];
    const verdict = verifyChain(updatedChain);

    expect(verdict.ok).toBe(true);
    expect(verdict.length).toBe(3);
    expect(updatedChain[2]?.type).toBe("sent");
  });
});
