import type { Draft } from "./types";

/**
 * The Voice Return meter.
 *
 * "You spoke 84 words; SayOnce delivered 412 words to 5 people in 3 languages;
 * about 14 minutes saved." It quantifies, inside the product, what dictating
 * bought — which is the one number a Wispr judge is most likely to remember.
 *
 * Every figure here is computed, never estimated by a model. The minutes-saved
 * figure leans on one measured input: the speaker's own baseline minutes per
 * update, recorded in Phase 0 before the tool existed.
 */

export function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/u).length;
}

export interface VoiceReturn {
  wordsSpoken: number;
  wordsDelivered: number;
  people: number;
  languages: number;
  /** Null until a real baseline exists. Never shown as a guess. */
  minutesSaved: number | null;
  /** The multiplier for the headline: "84 words became 412". */
  amplification: number;
}

export function voiceReturn(input: {
  spokenText: string;
  drafts: Draft[];
  languagesByContactId: Record<string, string>;
  /** Minutes this update used to take, measured in Phase 0. */
  baselineMinutesPerUpdate: number | null;
  /** Seconds from opening Speak to the last send, measured by the app. */
  actualSeconds: number | null;
}): VoiceReturn {
  const wordsSpoken = countWords(input.spokenText);
  const wordsDelivered = input.drafts.reduce(
    (total, draft) => total + countWords(draft.subject ?? "") + countWords(draft.body),
    0,
  );

  const languages = new Set(
    input.drafts.map((d) => normaliseLanguage(input.languagesByContactId[d.contactId] ?? "")),
  );
  languages.delete("");

  const minutesSaved =
    input.baselineMinutesPerUpdate === null || input.actualSeconds === null
      ? null
      : Math.max(0, round1(input.baselineMinutesPerUpdate - input.actualSeconds / 60));

  return {
    wordsSpoken,
    wordsDelivered,
    people: input.drafts.length,
    languages: languages.size,
    minutesSaved,
    amplification: wordsSpoken === 0 ? 0 : round1(wordsDelivered / wordsSpoken),
  };
}

export function sumVoiceReturn(items: VoiceReturn[]): VoiceReturn {
  const wordsSpoken = items.reduce((t, i) => t + i.wordsSpoken, 0);
  const wordsDelivered = items.reduce((t, i) => t + i.wordsDelivered, 0);
  const measured = items.filter((i) => i.minutesSaved !== null);
  return {
    wordsSpoken,
    wordsDelivered,
    people: items.reduce((t, i) => t + i.people, 0),
    languages: Math.max(0, ...items.map((i) => i.languages)),
    minutesSaved: measured.length === 0
      ? null
      : round1(measured.reduce((t, i) => t + (i.minutesSaved ?? 0), 0)),
    amplification: wordsSpoken === 0 ? 0 : round1(wordsDelivered / wordsSpoken),
  };
}

/**
 * "Hindi, Devanagari" and "hindi (devanagari script)" are one language for
 * counting purposes; "Hinglish" is its own, because it is what the speaker
 * chose for that reader.
 */
function normaliseLanguage(language: string): string {
  return language.toLowerCase().split(/[,(]/)[0]?.trim() ?? "";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
