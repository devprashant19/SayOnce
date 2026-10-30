"use client";

import { useMemo, useState } from "react";
import { whatsappLink, mailtoLink, decodeSendLink } from "@/lib/links";

interface TrickyCase {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  body: string;
}

const TRICKY_CASES: TrickyCase[] = [
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
    body: "पहला बिंदु: काम पूरा हुआ।\n\nदूसरा बिंदु: नया बिल्ड आ रहा है।\n\nतीसरा बिंदु: सोमवार को डिलीवरी है।\n\nसादर,\nप्रशांत",
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

export default function SendTestPage() {
  const [filter, setFilter] = useState<"all" | "fail" | "pass">("all");
  const isProduction = process.env.NODE_ENV === "production";
  const [devAllowed, setDevAllowed] = useState(!isProduction);

  useMemo(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "1" || params.get("dev") === "true") {
        setDevAllowed(true);
      }
    }
  }, []);

  const results = useMemo(() => {
    return TRICKY_CASES.map((tc) => {
      // 1. WhatsApp link test
      const waLink = whatsappLink(tc.phone, tc.body);
      const decodedWa = decodeSendLink(waLink);
      const waDigitsExpected = tc.phone.replace(/\D/g, "");
      const waPass = decodedWa.to === waDigitsExpected && decodedWa.body === tc.body;

      // 2. Mailto link test
      const mailLink = mailtoLink(tc.email, tc.subject, tc.body);
      const decodedMail = decodeSendLink(mailLink);
      const mailPass =
        decodedMail.to === tc.email &&
        decodedMail.subject === tc.subject &&
        decodedMail.body === tc.body;

      const passed = waPass && mailPass;

      return {
        ...tc,
        waLink,
        mailLink,
        waPass,
        mailPass,
        passed,
        waError: !waPass ? `Body mismatch: expected len ${tc.body.length}, got ${decodedWa.body.length}` : null,
        mailError: !mailPass ? `Mail mismatch: expected len ${tc.body.length}, got ${decodedMail.body.length}` : null,
      };
    });
  }, []);

  const totalPassed = results.filter((r) => r.passed).length;
  const filtered = results.filter((r) => {
    if (filter === "pass") return r.passed;
    if (filter === "fail") return !r.passed;
    return true;
  });

  if (isProduction && !devAllowed) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-6 text-center space-y-2">
        <h1 className="text-lg font-semibold">Development Only</h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          The Send Layer Round-Trip test harness is restricted to development environments.
          Append <code className="rounded bg-[var(--color-paper-sunk)] px-1.5 py-0.5 font-mono text-xs">?dev=1</code> to view in preview.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-block rounded bg-[var(--color-accent-wash)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
          Dev Only · Phase 3 Verification
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Send Layer Round-Trip Test</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Byte-for-byte verification across 12 tricky bodies: Devanagari, emoji, CRLF line breaks,
          special characters, and international phone prefixes (+91, +1, +52, +55).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">
            Status: {totalPassed} of {TRICKY_CASES.length} cases passed byte-for-byte
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              totalPassed === TRICKY_CASES.length
                ? "bg-[var(--color-verified-wash)] text-[var(--color-verified)]"
                : "bg-[var(--color-blocked-wash)] text-[var(--color-blocked)]"
            }`}
          >
            {totalPassed === TRICKY_CASES.length ? "100% Pass" : "Failures"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded px-2.5 py-1 ${filter === "all" ? "bg-[var(--color-ink)] text-white" : "border border-[var(--color-rule)]"}`}
          >
            All ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pass")}
            className={`rounded px-2.5 py-1 ${filter === "pass" ? "bg-[var(--color-ink)] text-white" : "border border-[var(--color-rule)]"}`}
          >
            Passed ({totalPassed})
          </button>
          <button
            type="button"
            onClick={() => setFilter("fail")}
            className={`rounded px-2.5 py-1 ${filter === "fail" ? "bg-[var(--color-ink)] text-white" : "border border-[var(--color-rule)]"}`}
          >
            Failed ({results.length - totalPassed})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item, idx) => (
          <article
            key={item.id}
            className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--color-ink-soft)]">#{idx + 1}</span>
                <h2 className="text-sm font-semibold">{item.name}</h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`rounded px-2 py-0.5 font-medium ${
                    item.waPass ? "bg-[var(--color-verified-wash)] text-[var(--color-verified)]" : "bg-[var(--color-blocked-wash)] text-[var(--color-blocked)]"
                  }`}
                >
                  WhatsApp: {item.waPass ? "Pass" : "Fail"}
                </span>
                <span
                  className={`rounded px-2 py-0.5 font-medium ${
                    item.mailPass ? "bg-[var(--color-verified-wash)] text-[var(--color-verified)]" : "bg-[var(--color-blocked-wash)] text-[var(--color-blocked)]"
                  }`}
                >
                  Email: {item.mailPass ? "Pass" : "Fail"}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--color-ink-soft)]">
                <div>
                  <span className="font-medium text-[var(--color-ink)]">Phone: </span>
                  <span className="font-mono">{item.phone}</span>
                </div>
                <div>
                  <span className="font-medium text-[var(--color-ink)]">Email: </span>
                  <span>{item.email}</span>
                </div>
              </div>

              <div>
                <span className="font-medium text-[var(--color-ink)]">Subject: </span>
                <span className="text-[var(--color-ink-soft)]">{item.subject}</span>
              </div>

              <div>
                <span className="font-medium text-[var(--color-ink)]">Original Body:</span>
                <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap rounded bg-[var(--color-paper-sunk)] p-2 font-sans text-xs">
                  {item.body}
                </pre>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={item.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-[var(--color-accent)] px-3 py-1.5 font-medium text-[var(--color-on-accent)] text-xs hover:opacity-90"
                >
                  Test wa.me link ↗
                </a>
                <a
                  href={item.mailLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-[var(--color-rule)] px-3 py-1.5 font-medium text-xs hover:bg-[var(--color-paper-sunk)]"
                >
                  Test mailto: link ↗
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
