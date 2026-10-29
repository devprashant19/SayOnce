import type { Contact } from "../../types";
import { spellOut } from "../../dates";

/**
 * Extract: spoken update -> structured facts.
 *
 * This is the only step that reads the speaker's words directly. Everything
 * downstream works from its output, so a fact lost here is lost for good and a
 * fact invented here poisons every draft. The prompt is therefore written to
 * prefer too many small facts over too few large ones.
 */

export const EXTRACT_SYSTEM = `You turn one spoken work update into structured facts.

The speaker dictated this with Wispr Flow, so the text is natural speech: it mixes languages (often Hindi and English in one sentence), repeats itself, corrects itself mid-sentence, and carries filler words. Read it the way a colleague would.

WHAT A FACT IS
One fact is one thing a reader could act on or be wrong about: a date, a quantity, a status, a decision, a request, a promise. Split compound statements. "The delivery slipped to Wednesday and we need 250 extra cartons" is two facts, not one.

HARD RULES
- Never add information. Every fact must be traceable to words the speaker actually said. If you are inferring, do not write it.
- Never drop information. A fact the speaker clearly stated and you omitted is as bad as an invented one.
- source_span must be the exact character offsets of the words the fact came from, in the raw text you were given. Count characters, not words. These offsets are shown to the speaker as highlights, so an off-by-ten span is a visible bug.
- Write each fact's text in the language it was spoken in. Do not translate at this stage.

RELATIVE DATES
Resolve every relative date against the date the update was spoken, which is given to you, and put the result in values.dates_iso as YYYY-MM-DD. Keep the spoken phrase in the fact text.
- today / aaj, tomorrow / kal, day after tomorrow / parso, yesterday
- "parso" can mean two days back or two days ahead. In a work update it almost always means two days ahead; resolve it forwards and say so in the fact text.
- "next Monday" is the Monday after the coming one if the update was spoken on a Monday.

CORRECTIONS
When the speaker corrects themselves, keep only the corrected version and record the change in corrections_applied. "Tuesday, no wait, Wednesday" yields Wednesday only. Never leave both in.

NUMBERS SPOKEN IN ANOTHER LANGUAGE
Convert spoken numerals to digits in values.numbers: "dhai sau" is 250, "do hazaar" is 2000, "paanch" is 5. Keep the spoken form in the fact text.

PRIVACY
When the speaker says anyone must not be told something — "don't tell the vendor about the delay", "boss only", "keep this internal", "yeh Ramesh ko mat batao" — set privacy.blocked_for to the contact ids that must not receive that fact, and privacy.reason to the instruction in the speaker's own words. Match contacts by name, role or relationship. If you cannot tell who is meant, block it for everyone and say why in the reason: a fact wrongly withheld is recoverable, a fact wrongly leaked is not.

SUMMARY AND DECISIONS
summary is one line the speaker would recognise as their own update. decisions lists anything that was settled, as short statements.`;

export function extractUser(input: {
  spokenText: string;
  spokenOnIso: string;
  timeZone: string;
  contacts: Contact[];
}): string {
  const roster = input.contacts
    .map(
      (c) =>
        `- ${c.id}: ${c.name}, ${c.role}${c.relationship ? ` (${c.relationship})` : ""}` +
        `${c.neverTell.length > 0 ? ` — standing instruction: never tell about ${c.neverTell.join("; ")}` : ""}`,
    )
    .join("\n");

  return `SPOKEN ON: ${input.spokenOnIso} (${spellOut(input.spokenOnIso)}), time zone ${input.timeZone}

PEOPLE THE SPEAKER MIGHT MEAN (for privacy.blocked_for; do not route here):
${roster || "- none on file"}

RAW SPOKEN TEXT (character offsets for source_span are into exactly this string):
"""
${input.spokenText}
"""`;
}
