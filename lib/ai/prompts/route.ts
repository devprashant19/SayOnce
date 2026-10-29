import type { Contact, Fact } from "../../types";

/**
 * Route: facts -> who needs to know, and why.
 *
 * Built in Phase 2. The prompt lives here from Phase 1 so the pipeline's shape
 * is visible from the start, and because Phase 1's hard-coded contact list is
 * meant to be replaced, not worked around.
 *
 * Routing is the step that makes SayOnce a fan-out rather than a translator:
 * it decides what each person needs to know, not just how to phrase it.
 */

export const ROUTE_SYSTEM = `You decide which people need to hear about a spoken work update, and which facts each of them needs.

You are not writing anything yet. You are making a judgement a careful colleague would make: who is affected, who would be annoyed to find out later, and who genuinely does not need this.

HARD RULES
- Set include to false for anyone this update does not concern. If the update concerns nobody, set concerns_nobody and return every contact with include false. Never pad the list to look useful.
- fact_ids for a contact must never include a fact whose privacy.blocked_for contains that contact's id, and must never include anything covered by that contact's standing never_tell topics. Check this twice: a leak here cannot be undone downstream.
- reason is one line a person can check in two seconds, naming the specific thing that affects them. "Affected by the update" is not a reason. "The delivery date he quoted the warehouse has moved" is.
- confidence is your honest estimate that this person needs this update. Below 0.6 means you are guessing; those are shown to the speaker unticked, so an honest low number is more useful than a confident wrong one.

HOW TO CHOOSE FACTS PER PERSON
Start from their "cares about" note and their role. A vendor needs quantities and dates, not internal reasoning. A manager needs risks, decisions and dates, not operational detail. A field lead needs what changes for them tomorrow. Include a fact when its absence would make the person act wrongly.`;

export function routeUser(input: {
  facts: Fact[];
  contacts: Contact[];
  project: string;
  /** Contacts who usually hear about this project, for "Who did I forget?". */
  usualForProject: string[];
}): string {
  const facts = input.facts
    .map(
      (f) =>
        `- ${f.id} [${f.type}]: ${f.text}` +
        (f.privacy.blockedFor.length > 0
          ? ` — BLOCKED FOR: ${f.privacy.blockedFor.join(", ")} (${f.privacy.reason})`
          : ""),
    )
    .join("\n");

  const contacts = input.contacts
    .map(
      (c) =>
        `- ${c.id}: ${c.name}, ${c.role}${c.relationship ? ` (${c.relationship})` : ""}\n` +
        `  cares about: ${c.caresAbout || "not specified"}\n` +
        `  never tell: ${c.neverTell.length > 0 ? c.neverTell.join("; ") : "nothing on file"}`,
    )
    .join("\n");

  const usual = input.usualForProject.length > 0
    ? `\nUSUALLY HEARS ABOUT THIS PROJECT: ${input.usualForProject.join(", ")}`
    : "";

  return `PROJECT: ${input.project || "not specified"}

FACTS:
${facts}

CONTACTS:
${contacts}${usual}

Return one decision per contact, in the order the contacts are listed.`;
}
