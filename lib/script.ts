/**
 * Script detection by Unicode range. Deterministic — no AI involved.
 *
 * SayOnce promises that a contact whose profile says "Hindi, Devanagari" gets
 * Devanagari and a contact whose profile says "Hinglish, Roman" gets Latin.
 * That promise is only worth something if a machine checks it.
 */

export type ScriptName = "devanagari" | "latin" | "arabic" | "cyrillic" | "cjk" | "other";

const RANGES: ReadonlyArray<readonly [ScriptName, RegExp]> = [
  ["devanagari", /[ऀ-ॿ]/u],
  ["arabic", /[؀-ۿݐ-ݿ]/u],
  ["cyrillic", /[Ѐ-ӿ]/u],
  ["cjk", /[぀-ヿ一-鿿가-힯]/u],
  ["latin", /[A-Za-z]/u],
];

/** Every script present in the text, in descending order of character count. */
export function scriptsIn(text: string): ScriptName[] {
  const counts = new Map<ScriptName, number>();
  for (const char of text) {
    for (const [name, pattern] of RANGES) {
      if (pattern.test(char)) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
        break;
      }
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

/** The script that carries most of the text, or "other" when there is none. */
export function dominantScript(text: string): ScriptName {
  return scriptsIn(text)[0] ?? "other";
}

/**
 * What script a free-text language label asks for.
 *
 * The language field is deliberately free text, so this reads intent rather
 * than matching an enum. An unrecognised label returns null, which the checker
 * treats as "no script requirement" instead of a failure — a wrong block on a
 * language we do not know about would be worse than no check.
 */
export function requestedScript(language: string): ScriptName | null {
  const lang = language.toLowerCase();

  // An explicit script instruction always wins over the language name.
  if (/\b(devanagari|देवनागरी)\b/.test(lang)) return "devanagari";
  if (/\b(roman|romanis|latin|transliterat)/.test(lang)) return "latin";

  // "Hinglish" is Hindi written in Roman script. Check it before "hindi".
  if (/hinglish|hindlish/.test(lang)) return "latin";
  if (/\b(hindi|marathi|nepali|sanskrit)\b/.test(lang)) return "devanagari";

  if (/\b(arabic|urdu|farsi|persian)\b/.test(lang)) return "arabic";
  if (/\b(russian|ukrainian|bulgarian|serbian)\b/.test(lang)) return "cyrillic";
  if (/\b(japanese|chinese|mandarin|korean)\b/.test(lang)) return "cjk";

  if (
    /\b(english|spanish|portuguese|french|german|italian|dutch|indonesian|bahasa|tagalog|taglish|swahili|hausa|pidgin|spanglish|vietnamese|turkish)\b/
      .test(lang)
  ) {
    return "latin";
  }

  return null;
}
