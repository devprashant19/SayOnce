/**
 * Output scrub.
 *
 * A spoken update sometimes carries something that should never be written
 * down, let alone saved in a log or shown on a demo screen to a judge: an OTP
 * read out loud, a card number, a bank account, an Aadhaar-style id, a
 * password. The scrub runs before anything is displayed, saved or logged, and
 * records in the Trust Trail that masking happened.
 *
 * Borrowed by description from InsightPulse's output scrubbing.
 */

export interface ScrubResult {
  text: string;
  /** What was masked, by kind. Never the value itself. */
  masked: Array<{ kind: ScrubKind; count: number }>;
}

export type ScrubKind =
  | "otp"
  | "card"
  | "bank-account"
  | "government-id"
  | "password"
  | "api-key";

interface Rule {
  kind: ScrubKind;
  pattern: RegExp;
  replacement: string;
}

const RULES: readonly Rule[] = [
  {
    kind: "password",
    pattern: /\b(password|passcode|pin|pwd)\b\s*(?:is|:|=)?\s*\S{3,}/giu,
    replacement: "$1 [hidden]",
  },
  {
    kind: "otp",
    pattern: /\b(otp|one[\s-]?time[\s-]?password|verification code)\b\s*(?:is|:|=)?\s*\d{4,8}\b/giu,
    replacement: "$1 [hidden]",
  },
  {
    kind: "api-key",
    pattern: /\b(?:sk|pk|api|key|token)[-_][A-Za-z0-9_-]{16,}\b/g,
    replacement: "[hidden key]",
  },
  {
    kind: "card",
    // 13-19 digits in groups, the shape of a payment card.
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    replacement: "[hidden card number]",
  },
  {
    kind: "government-id",
    // Aadhaar-style: four-four-four.
    pattern: /\b\d{4}[ -]\d{4}[ -]\d{4}\b/g,
    replacement: "[hidden ID]",
  },
  {
    kind: "bank-account",
    pattern: /\b(?:a\/c|account|acct|khata)\b\s*(?:no\.?|number|:)?\s*\d{8,18}\b/giu,
    replacement: "[hidden account number]",
  },
];

export function scrub(text: string): ScrubResult {
  let output = text;
  const masked: ScrubResult["masked"] = [];

  for (const rule of RULES) {
    const matches = output.match(rule.pattern);
    if (!matches || matches.length === 0) continue;
    output = output.replace(rule.pattern, rule.replacement);
    masked.push({ kind: rule.kind, count: matches.length });
  }

  return { text: output, masked };
}

/**
 * Stronger version for the public /proof page, which shows real-use totals and
 * must carry no name, phone number or address at all.
 */
export function anonymise(text: string): string {
  return scrub(text)
    .text
    .replace(/\+?\d[\d ()-]{7,}\d/g, "[number]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]");
}
