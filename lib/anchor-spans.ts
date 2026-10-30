import type { Fact } from "./types";

/**
 * Where each fact sits in the spoken text, decided by code.
 *
 * The model reports a fact's source as character offsets, and models cannot
 * count characters: in the prepared demo 23 of 25 spans pointed at the wrong
 * words, so the provenance highlight lit up a neighbouring phrase. The fact's
 * own words are the ground truth, so find them:
 *
 *   1. the fact quoted verbatim, at the occurrence nearest the model's guess;
 *   2. otherwise the shortest run of spoken words that starts with the fact's
 *      first word and contains most of the rest, in order ("The audit is on
 *      Wednesday" ← "The audit is on Tuesday, no wait, Wednesday");
 *   3. otherwise the model's span, clamped inside the text.
 */

const WORD = /[\p{L}\p{N}']+/gu;

interface Word {
  w: string;
  start: number;
  end: number;
}

export function anchorSpans(spokenText: string, facts: Fact[]): Fact[] {
  const lower = spokenText.toLowerCase();
  const words: Word[] = [...spokenText.matchAll(WORD)].map((m) => ({
    w: m[0].toLowerCase(),
    start: m.index,
    end: m.index + m[0].length,
  }));
  return facts.map((fact) => ({ ...fact, sourceSpan: anchor(fact) }));

  function anchor(fact: Fact): { start: number; end: number } {
    const guess = fact.sourceSpan.start;
    const nearer = (a: number, b: number) => Math.abs(a - guess) < Math.abs(b - guess);

    // 1. Verbatim.
    const needle = fact.text.trim().replace(/[.,;:!?]+$/, "").toLowerCase();
    let verbatim = -1;
    for (let i = needle ? lower.indexOf(needle) : -1; i >= 0; i = lower.indexOf(needle, i + 1)) {
      if (verbatim < 0 || nearer(i, verbatim)) verbatim = i;
    }
    if (verbatim >= 0) return { start: verbatim, end: verbatim + needle.length };

    // 2. The fact's words, in order, within a short run of spoken words.
    const want = [...fact.text.toLowerCase().matchAll(WORD)].map((m) => m[0]);
    let best: { start: number; end: number; matched: number } | null = null;
    if (want.length > 0) {
      for (let i = 0; i < words.length; i += 1) {
        if (words[i]!.w !== want[0]) continue;
        let matched = 1;
        let last = i;
        for (let j = i + 1; j < words.length && matched < want.length && j - i < want.length * 3; j += 1) {
          if (words[j]!.w === want[matched]) {
            matched += 1;
            last = j;
          }
        }
        const candidate = { start: words[i]!.start, end: words[last]!.end, matched };
        if (
          !best ||
          candidate.matched > best.matched ||
          (candidate.matched === best.matched && nearer(candidate.start, best.start))
        ) {
          best = candidate;
        }
      }
    }
    if (best && best.matched / want.length >= 0.6) return { start: best.start, end: best.end };

    // 3. The model's guess, kept inside the text.
    const max = spokenText.length;
    const start = Math.min(Math.max(fact.sourceSpan.start, 0), max);
    return { start, end: Math.min(Math.max(fact.sourceSpan.end, start), max) };
  }
}
