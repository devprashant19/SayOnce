import type { Contact, Draft, Fact } from "../../types";

/**
 * Verify, AI layer.
 *
 * Built in Phase 4. This runs *after* lib/checker.ts, never instead of it.
 * The deterministic checker catches invented numbers, dates, names, leaks,
 * wrong script and channel breaches. This step catches what arithmetic cannot:
 * a fact the reader needed and did not get, a claim smuggled in as phrasing,
 * a tone that will land badly.
 *
 * If this layer and the checker disagree, the checker wins.
 */

export const VERIFY_SYSTEM = `You are checking a drafted message against the facts it was written from. You did not write it, and your job is to find what is wrong with it.

Be specific and be hard to please. A vague complaint is useless; name the sentence.

WHAT TO LOOK FOR
1. missing_must_know — facts the reader was given that genuinely needed to reach them and do not appear in the message. Do not list facts that were deliberately left out as irrelevant to this reader; list the ones whose absence would make the reader act wrongly.
2. added_claims — anything the message asserts that is not in the facts. This includes soft additions: "as we discussed", "the team is on it", an implied cause, a next step nobody promised, a time of day nobody gave. Quote the exact phrase.
3. tone_score, 1 to 5 — how well the message matches the reader's stated formality and relationship. 5 is what that reader would expect from this sender. 3 means noticeably off. 1 means it would cause offence or confusion.
4. issues — anything else a careful person would flag: wrong language or script, a greeting to the wrong name, a length that does not fit the channel, an instruction to the wrong party.

Return empty lists when there is genuinely nothing to report. Do not invent a complaint to look thorough.`;

export function verifyUser(input: {
  draft: Draft;
  contact: Contact;
  allowedFacts: Fact[];
  mustKnowHint: string[];
}): string {
  const facts = input.allowedFacts
    .map((f) => `- ${f.id} [${f.type}]: ${f.text}`)
    .join("\n");

  const mustKnow = input.mustKnowHint.length > 0
    ? `\nFACTS THIS READER MUST RECEIVE:\n${input.mustKnowHint.map((m) => `- ${m}`).join("\n")}`
    : "";

  return `READER
Name: ${input.contact.name}
Role: ${input.contact.role}
Language and script asked for: ${input.contact.language}
Formality asked for: ${input.contact.formality}
Channel: ${input.contact.channel}
Cares about: ${input.contact.caresAbout || "not specified"}

FACTS THE WRITER WAS GIVEN (the complete set; anything outside this is an added claim):
${facts}${mustKnow}

THE DRAFT
${input.draft.channel === "email" ? `Subject: ${input.draft.subject ?? "(none)"}\n` : ""}${input.draft.body}

Check it.`;
}

/**
 * The grader used by the Quality Lab, kept separate from the in-app Verify
 * step. It is scored against the golden set's recorded expectations rather
 * than its own judgement of what matters, and it runs at a fixed effort level
 * so two runs a day apart are comparable.
 */
export const GRADER_SYSTEM = `You are grading one pipeline output against a recorded expectation. Apply the rubric literally. Do not be generous and do not be creative.

RUBRIC
- must_know_covered: for each required fact, does the draft convey it? Paraphrase counts. A fact reworded correctly is covered; a fact softened into vagueness is not.
- blocked_present: for each blocked fact, does the draft convey it, in any wording, including by implication? Any leak is a failure.
- language_ok: is the draft in the language and script the expectation names?
- tone_fit: 1 to 5 against the stated formality.
- channel_ok: WhatsApp drafts short and plain; email drafts carry a subject.

Return the booleans and lists exactly as the schema asks. Your explanation must cite the sentence you judged on.`;
