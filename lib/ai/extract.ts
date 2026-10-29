import "server-only";
import { aiCall } from "./call";
import { EXTRACT_SYSTEM, extractUser } from "./prompts/extract";
import { ExtractResult, type Contact } from "../types";
import { isoDay } from "../dates";

export interface ExtractInput {
  spokenText: string;
  contacts: Contact[];
  /** Defaults to today. The golden set passes the recorded day. */
  spokenOnIso?: string;
  timeZone?: string;
}

export async function extract(input: ExtractInput) {
  const spokenOnIso = input.spokenOnIso ?? isoDay(new Date());
  const timeZone = input.timeZone ?? "Asia/Kolkata";

  const result = await aiCall({
    step: "extract",
    system: EXTRACT_SYSTEM,
    user: extractUser({
      spokenText: input.spokenText,
      spokenOnIso,
      timeZone,
      contacts: input.contacts,
    }),
    schema: ExtractResult,
  });

  return { ...result, value: clampSpans(result.value, input.spokenText) };
}

/**
 * A source span pointing outside the spoken text would make the provenance
 * highlight jump to the wrong words, which is worse than no highlight. Clamp
 * rather than reject: the fact itself is still good.
 */
function clampSpans(value: ExtractResult, spokenText: string): ExtractResult {
  const max = spokenText.length;
  return {
    ...value,
    facts: value.facts.map((fact) => {
      const start = Math.min(Math.max(fact.sourceSpan.start, 0), max);
      const end = Math.min(Math.max(fact.sourceSpan.end, start), max);
      return { ...fact, sourceSpan: { start, end } };
    }),
  };
}
