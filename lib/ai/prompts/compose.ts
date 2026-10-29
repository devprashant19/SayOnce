import type { Contact, Fact } from "../../types";
import { CHANNEL_LIMITS } from "../../checker";

/**
 * Compose: facts -> one message for one person.
 *
 * Called once per selected contact, and given only the facts that contact is
 * allowed to see. Blocked facts never reach this prompt at all — the Privacy
 * Shield is enforced by what we pass in, not by asking the model to be careful.
 * That is the difference between a guarantee and a hope.
 */

export const COMPOSE_SYSTEM = `You write one message to one person, from facts someone spoke out loud.

You are not translating and you are not summarising. You are deciding what this particular reader needs to know, and saying it the way they would want to hear it.

HARD RULES
- Use only the facts you are given. Every number, date, name and place in your message must appear in those facts. If a fact is not there, the reader does not get it, even if it seems obviously relevant.
- Never add a pleasantry that contains information: no invented times, no "as discussed yesterday", no made-up next steps.
- Write in the reader's language and script exactly as their profile asks. "Hindi, Devanagari" means Devanagari characters. "Hinglish" means Hindi and English mixed, written in Roman letters. "Brazilian Portuguese, informal" means exactly that.
- Match their formality. Formal means full sentences and the honorifics their language expects. Casual means short lines and no ceremony.
- sentences must break your message into its actual sentences, each mapped to the fact ids it carries. A sentence that carries no fact (a greeting, a sign-off) maps to an empty list. This mapping is shown to the speaker as hover highlights, so it has to be honest.
- used_fact_ids is every fact id you actually used. Do not list facts you left out.

WHAT TO INCLUDE
Read the reader's "cares about" note as an instruction about priority, not a filter. If they care about dates and quantities, those go first and in the first line. If a fact you were given does not matter to them at all, you may leave it out — say less rather than padding.

CHANNEL
- WhatsApp: no subject. Under ${CHANNEL_LIMITS.whatsappBodyChars} characters. Short lines, readable on a phone without scrolling. Plain text only: no markdown headings, no bullet characters, no links in brackets — WhatsApp shows those literally.
- Email: a subject under ${CHANNEL_LIMITS.emailSubjectChars} characters that says what changed, then a body with a greeting, the facts, and a sign-off.`;

export function composeUser(input: {
  contact: Contact;
  facts: Fact[];
  project: string;
  /** Accepted voice-feedback rules for this contact, newest last. */
  learnedRules: string[];
  /** What this person was told before, for consistency. Empty in Phase 1. */
  previouslyTold: string[];
}): string {
  const facts = input.facts
    .map(
      (f) =>
        `- ${f.id} [${f.type}]: ${f.text}` +
        (f.values.datesIso.length > 0 ? ` (dates: ${f.values.datesIso.join(", ")})` : "") +
        (f.values.numbers.length > 0 ? ` (numbers: ${f.values.numbers.join(", ")})` : ""),
    )
    .join("\n");

  const rules = input.learnedRules.length > 0
    ? `\nRULES THIS READER'S PROFILE HAS LEARNED (the speaker accepted each one; follow them all):\n${input.learnedRules.map((r) => `- ${r}`).join("\n")}`
    : "";

  const history = input.previouslyTold.length > 0
    ? `\nWHAT THIS READER WAS ALREADY TOLD ON THIS PROJECT (do not repeat it as news; reference it only if a fact below changes it):\n${input.previouslyTold.map((h) => `- ${h}`).join("\n")}`
    : "";

  return `READER
Name: ${input.contact.name}
Role: ${input.contact.role}${input.contact.relationship ? `\nRelationship to the speaker: ${input.contact.relationship}` : ""}
Language and script: ${input.contact.language}
Formality: ${input.contact.formality}
Channel: ${input.contact.channel}
Cares about: ${input.contact.caresAbout || "not specified"}

PROJECT: ${input.project || "not specified"}

FACTS YOU MAY USE (this is the complete set available to this reader):
${facts}${rules}${history}

Write ${input.contact.name}'s message.`;
}
