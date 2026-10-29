import type { Contact, Draft, Fact } from "./types";
import { dominantScript, requestedScript } from "./script";

/**
 * The deterministic verifier.
 *
 * SayOnce's accuracy claim is not "the AI says it checked". It is that a plain
 * function, with no model in it, re-reads every draft against the facts that
 * were handed to that contact and refuses anything it cannot account for.
 * This module has final authority: when it fails a draft, the send button is
 * disabled no matter what the AI verify step thought.
 *
 * Written in Phase 1 and reused unchanged by the Verify step (Phase 4) and the
 * Quality Lab. Do not fork it.
 */

export const CHANNEL_LIMITS = {
  whatsappBodyChars: 700,
  emailSubjectChars: 70,
} as const;

export type CheckCode =
  | "invented-number"
  | "invented-date"
  | "invented-name"
  | "blocked-fact-leak"
  | "unused-fact-claimed"
  | "wrong-script"
  | "missing-subject"
  | "subject-too-long"
  | "body-too-long"
  | "markdown-in-whatsapp"
  | "empty-body";

export interface CheckFailure {
  code: CheckCode;
  /** One line a human reads on the card. No jargon. */
  message: string;
  /** The exact offending substring, so the UI can strike it through. */
  evidence?: string;
}

export interface CheckOutcome {
  ok: boolean;
  failures: CheckFailure[];
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

/** Digit groups, including Indian-style grouping and decimals. */
const NUMBER_PATTERN = /\d+(?:[.,]\d+)*/g;

/** Dates the composer may legitimately write, in several shapes. */
const DATE_PATTERNS: readonly RegExp[] = [
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?\b/gi,
];

/**
 * Numerals written as words, in the languages SayOnce ships with. A draft that
 * says "two hundred fifty" when no fact mentions 250 is still an invented
 * quantity, so the checker normalises these before comparing.
 */
const WORD_NUMBERS: Readonly<Record<string, string>> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30",
  forty: "40", fifty: "50", hundred: "100", thousand: "1000", lakh: "100000",
  crore: "10000000",
  ek: "1", do: "2", teen: "3", char: "4", paanch: "5", panch: "5",
  chhe: "6", saat: "7", aath: "8", nau: "9", das: "10",
  sau: "100", hazaar: "1000", hazar: "1000",
  uno: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5", cien: "100",
};

function words(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}+]+/u).filter(Boolean);
}

function numbersIn(text: string): Set<string> {
  const found = new Set<string>();
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    found.add(normaliseNumber(match[0]));
  }
  for (const word of words(text)) {
    if (word === "do") {
      // "do" is frequently an English verb ("do not", "please do", "to do")
      // or a Hindi imperative verb modifier ("bhej do", "kar do", "bata do"),
      // not the numeral 2. Only treat as 2 when not acting as a verb.
      if (
        /\b(?:please|to|will|can|could|would|should|did|does)\s+do\b/i.test(text) ||
        /\bdo\s+(?:not|n't|it|this|that|you|we|so|the|any|more|a|an)\b/i.test(text) ||
        /\b(?:bhej|kar|de|bata|rok|rakh|dekh|sun|le|padh|likh|aa|ja|khol|band|samajh|soch)\s+do\b/i.test(text)
      ) {
        continue;
      }
    }
    const mapped = WORD_NUMBERS[word];
    if (mapped) found.add(mapped);
  }
  return found;
}

/** "2,500" , "2.500" and "2500" are the same quantity. */
function normaliseNumber(raw: string): string {
  const stripped = raw.replace(/[.,](?=\d{3}\b)/g, "");
  const asNumber = Number(stripped.replace(/,/g, ""));
  return Number.isFinite(asNumber) ? String(asNumber) : stripped;
}

function datesIn(text: string): Set<string> {
  const found = new Set<string>();
  for (const pattern of DATE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      found.add(match[0].toLowerCase().replace(/(st|nd|rd|th)\b/g, "").trim());
    }
  }
  return found;
}

/**
 * Capitalised multi-word runs, which is as close as a deterministic check can
 * get to "a name". Weekday and month names are excluded: a draft is allowed to
 * say "Friday" when a fact resolved to a Friday, and a contact can legitimately
 * be called Friday — the AI verify layer catches the subtler cases.
 */
const NOT_A_NAME = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "hi", "hello", "dear", "thanks", "thank", "regards", "regarding", "update", "please",
  "subject", "re", "fwd", "ok", "okay", "note", "sir", "madam", "ji",
  "best", "cheers", "sincerely", "warmly", "team", "project",
  "hope", "also", "fyi", "as", "per", "attn", "cc", "bcc", "due", "your", "name",
  "i", "we", "you", "the", "a", "an", "and", "but", "so", "it", "this", "that",
]);

function namesIn(text: string): Set<string> {
  const found = new Set<string>();
  const pattern = /\b[A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,})*/g;

  for (const match of text.matchAll(pattern)) {
    // A capitalised word that only ever appears at the start of a sentence is
    // just a sentence start. Hinglish drafts open lines with "Baaki", "Kal",
    // "Aaj" constantly, and treating those as invented people would block
    // perfectly good drafts — a false block costs more than a missed name,
    // because the AI verify layer still reads for smuggled claims.
    if (startsSentence(text, match.index) && !appearsMidSentence(text, match[0])) continue;

    const parts = match[0].split(/\s+/).filter((p) => !NOT_A_NAME.has(p.toLowerCase()));
    for (const part of parts) found.add(part.toLowerCase());
  }
  return found;
}

function startsSentence(text: string, index: number): boolean {
  const prefix = text.slice(0, index);
  // If the word starts on a new line (with optional indentation or opening quotes), it starts a line
  if (/(?:^|\n)[^\S\r\n]*["'(\[]*$/.test(prefix)) return true;
  const before = prefix.replace(/["'(\[\s]+$/, "");
  return before.length === 0 || /[.!?:;\n]$/.test(before);
}

function appearsMidSentence(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const match of text.matchAll(new RegExp(`\\b${escaped}\\b`, "g"))) {
    if (!startsSentence(text, match.index)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

export interface CheckInput {
  draft: Draft;
  contact: Contact;
  /** Exactly the facts Compose was allowed to see for this contact. */
  allowedFacts: Fact[];
  /** Every fact of the update, used to detect leaks of what was withheld. */
  allFacts: Fact[];
}

export function checkDraft({ draft, contact, allowedFacts, allFacts }: CheckInput): CheckOutcome {
  const failures: CheckFailure[] = [];
  const body = draft.body ?? "";

  if (body.trim().length === 0) {
    return { ok: false, failures: [{ code: "empty-body", message: "The draft is empty." }] };
  }

  // --- 1. Nothing in the draft that is not in the facts -------------------
  const factText = allowedFacts
    .map((f) => [f.text, ...f.values.numbers, ...f.values.datesIso, ...f.values.names].join(" "))
    .join("\n");

  // The contact's own name and the speaker's greeting words are not facts the
  // update has to carry; a draft may address the person it is written to.
  const grantedNames = new Set([
    ...namesIn(factText),
    ...contact.name.toLowerCase().split(/\s+/),
  ]);
  const grantedNumbers = numbersIn(factText);
  const grantedDates = datesIn(factText);

  for (const number of numbersIn(body)) {
    // Phone numbers and years inside a quoted fact already come through
    // factText; a bare 1 or 2 from "2 of 5" style prose is not a quantity.
    if (grantedNumbers.has(number)) continue;
    failures.push({
      code: "invented-number",
      message: `The draft says ${number}, which you never said.`,
      evidence: number,
    });
  }

  for (const date of datesIn(body)) {
    if (grantedDates.has(date)) continue;
    // A date written in words may match an ISO fact for the same day.
    if ([...grantedDates].some((granted) => sameDay(granted, date))) continue;
    failures.push({
      code: "invented-date",
      message: `The draft mentions ${date}, which is not in your update.`,
      evidence: date,
    });
  }

  for (const name of namesIn(body)) {
    if (grantedNames.has(name)) continue;
    failures.push({
      code: "invented-name",
      message: `The draft names "${name}", who is not in your update.`,
      evidence: name,
    });
  }

  // --- 2. Nothing withheld may leak --------------------------------------
  const blockedFacts = allFacts.filter((f) => f.privacy.blockedFor.includes(contact.id));
  const haystack = `${body} ${draft.subject ?? ""}`.toLowerCase();
  for (const fact of blockedFacts) {
    const leak = findLeak(haystack, fact);
    if (leak) {
      failures.push({
        code: "blocked-fact-leak",
        message: `This draft leaks something ${contact.name} must not be told${
          fact.privacy.reason ? `: ${fact.privacy.reason}` : ""
        }.`,
        evidence: leak,
      });
    }
  }

  // --- 3. The draft's own claim about which facts it used -----------------
  const allowedIds = new Set(allowedFacts.map((f) => f.id));
  for (const id of draft.usedFactIds) {
    if (!allowedIds.has(id)) {
      failures.push({
        code: "unused-fact-claimed",
        message: `The draft claims fact ${id}, which was not available to ${contact.name}.`,
        evidence: id,
      });
    }
  }

  // --- 4. Language and script --------------------------------------------
  const wanted = requestedScript(contact.language);
  if (wanted) {
    const actual = dominantScript(body);
    if (actual !== wanted && actual !== "other") {
      failures.push({
        code: "wrong-script",
        message: `${contact.name} reads ${contact.language}, but this draft is in ${actual} script.`,
      });
    }
  }

  // --- 5. Channel fit ----------------------------------------------------
  if (draft.channel === "email") {
    const subject = draft.subject?.trim() ?? "";
    if (subject.length === 0) {
      failures.push({ code: "missing-subject", message: "An email draft needs a subject line." });
    } else if (subject.length > CHANNEL_LIMITS.emailSubjectChars) {
      failures.push({
        code: "subject-too-long",
        message: `The subject is ${subject.length} characters; keep it under ${CHANNEL_LIMITS.emailSubjectChars}.`,
      });
    }
  }

  if (draft.channel === "whatsapp") {
    if (body.length > CHANNEL_LIMITS.whatsappBodyChars) {
      failures.push({
        code: "body-too-long",
        message: `${body.length} characters is too long for WhatsApp; keep it under ${CHANNEL_LIMITS.whatsappBodyChars}.`,
      });
    }
    const markdown = body.match(/(^|\s)(#{1,6}\s|[-*]\s{1,}|\[[^\]]+\]\([^)]+\))/m);
    if (markdown) {
      failures.push({
        code: "markdown-in-whatsapp",
        message: "WhatsApp shows markdown literally. Write plain lines instead.",
        evidence: markdown[0].trim(),
      });
    }
  }

  return { ok: failures.length === 0, failures: dedupe(failures) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Does a loosely written date refer to the same calendar day as an ISO one? */
function sameDay(a: string, b: string): boolean {
  const left = toIso(a);
  const right = toIso(b);
  if (left === null || right === null) return false;
  if (left === right) return true;
  if (left.startsWith("--") && right.endsWith(left.slice(1))) return true;
  if (right.startsWith("--") && left.endsWith(right.slice(1))) return true;
  return false;
}

function toIso(value: string): string | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;

  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y!.length === 2 ? `20${y}` : y!;
    return `${year}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }

  const dayFirst = value.match(/^(\d{1,2})\s+([a-z]+)$/);
  if (dayFirst) {
    const month = MONTHS.findIndex((m) => m.startsWith(dayFirst[2]!));
    if (month >= 0) return `--${String(month + 1).padStart(2, "0")}-${dayFirst[1]!.padStart(2, "0")}`;
  }

  const monthFirst = value.match(/^([a-z]+)\s+(\d{1,2})$/);
  if (monthFirst) {
    const month = MONTHS.findIndex((m) => m.startsWith(monthFirst[1]!));
    if (month >= 0) return `--${String(month + 1).padStart(2, "0")}-${monthFirst[2]!.padStart(2, "0")}`;
  }

  return null;
}

/**
 * A blocked fact has leaked when the draft carries its distinctive content —
 * either one of its hard values, or enough of its content words that the
 * reader would learn the thing that was withheld.
 */
function findLeak(haystack: string, fact: Fact): string | null {
  for (const value of [...fact.values.numbers, ...fact.values.datesIso]) {
    const needle = String(value).toLowerCase();
    if (needle.length >= 2 && haystack.includes(needle)) return needle;
  }

  const content = words(fact.text).filter((w) => w.length > 3 && !STOPWORDS.has(w));
  if (content.length === 0) return null;
  const present = content.filter((w) => haystack.includes(w));
  if (present.length / content.length >= 0.6) return present.join(" ");

  return null;
}

const STOPWORDS = new Set([
  "that", "this", "with", "from", "have", "has", "will", "been", "they", "them",
  "their", "about", "there", "then", "than", "into", "some", "also", "because",
  "kiya", "hoga", "karna", "ke", "ki", "ka", "hai", "aur", "liye", "para",
]);

function dedupe(failures: CheckFailure[]): CheckFailure[] {
  const seen = new Set<string>();
  return failures.filter((f) => {
    const key = `${f.code}:${f.evidence ?? f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Facts a contact is allowed to see: routed to them and not blocked for them. */
export function factsForContact(facts: Fact[], contactId: string, factIds: string[]): Fact[] {
  const wanted = new Set(factIds);
  return facts.filter(
    (f) => wanted.has(f.id) && !f.privacy.blockedFor.includes(contactId),
  );
}

/** Must-know coverage for one recipient, used by the Quality Lab. */
export function mustKnowCoverage(body: string, mustKnow: string[]): { covered: string[]; missing: string[] } {
  const haystack = body.toLowerCase();
  const covered: string[] = [];
  const missing: string[] = [];
  for (const item of mustKnow) {
    const content = words(item).filter((w) => w.length > 2 && !STOPWORDS.has(w));
    const hits = content.filter((w) => haystack.includes(w)).length;
    const ratio = content.length === 0 ? 0 : hits / content.length;
    (ratio >= 0.6 ? covered : missing).push(item);
  }
  return { covered, missing };
}
