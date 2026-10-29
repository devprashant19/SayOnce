# Testing strategy

Five layers. Each catches a class of failure the others cannot, and each is
cheap enough to run at every gate.

## Layer 1 — Unit tests on the deterministic core

`npm run test` · Vitest · 90 tests today

The three modules that carry the product's promises are pure functions, which
makes them cheap to test exhaustively:

| File | Tests | What they protect |
| --- | --- | --- |
| `tests/checker.test.ts` | 22 | Invented numbers, dates and names; blocked-fact leaks; script mismatch; channel breaches; false positives on Hinglish sentence starts |
| `tests/links.test.ts` | 33 | Devanagari, emoji, line breaks, `&`, `#`, `?`, quotes, accents, very long bodies — all round-tripped through `wa.me` and `mailto:` byte for byte |
| `tests/trail.test.ts` | 12 | Canonical JSON stability, chain linkage, and four kinds of tampering including a re-signed row |
| `tests/dates.test.ts` | 23 | "parso", "kal", bare vs "next" weekdays, month boundaries; script detection; the scrub; Voice Return arithmetic |

**The rule:** anything a plain function can check is checked by a plain
function, and a new deterministic behaviour arrives with its test in the same
change.

## Layer 2 — Round-trip tests on the send layer

Phase 3 builds a dev-only send-test page listing twelve tricky bodies. For each
one it generates both links, decodes them back, and compares with the original.

The unit tests already cover this at the function level; the page exists because
*a link that decodes correctly can still open the wrong thing on a real device.*

Then test on real devices: Android Chrome, iOS Safari, desktop Chrome. Ten
sends to your own number. Check specifically:

- Devanagari arrives unbroken
- line breaks survive
- nothing is truncated
- the chat that opens is the right one
- numbers from three different countries all work

## Layer 3 — The Quality Lab

`npm run lab` · the golden set through the live pipeline

This is the only layer that tests the thing the product actually promises. It
is covered in full in [07-ACCURACY-SYSTEM.md](07-ACCURACY-SYSTEM.md).

| Run this | When |
| --- | --- |
| `npm run lab -- --case <id>` | While debugging one failure |
| `npm run lab -- --group <group>` | While working on a class of cases |
| `npm run lab` | **At every gate. The whole set, not just the failures.** |

Exit codes: 2 for a hard-gate failure (invented facts, privacy), 1 for a missed
soft target. So it can gate a deploy script.

## Layer 4 — UI and accessibility

At every gate, per screen:

- [ ] 360 px, 768 px, 1440 px
- [ ] light and dark
- [ ] empty, loading, error
- [ ] tab through start to finish; focus always visible; no trap
- [ ] one primary action, obvious
- [ ] `prefers-reduced-motion` on
- [ ] a Devanagari draft on screen, to check the font

Phase 6 does this systematically with screenshots before and after. Target
Lighthouse accessibility 95+.

Phase 7 adds performance budgets for the landing page: LCP under 2.5 s and no
layout shift on a throttled mid-range phone profile, 60 fps scroll on desktop.

### Playwright, if there is time

An end-to-end script is worth writing only for the paths that must not break
between the last deploy and judging:

1. `/demo` loads, Fan out produces cards instantly
2. A WhatsApp link has the right `wa.me` number and decodable text
3. A Privacy Shield block appears on the case that should produce one
4. Verify trail turns green
5. `/proof` contains no `@` and no `+` followed by digits

That is the smoke test automated. If the clock is tight, run it as a checklist
by hand instead — but run it.

## Layer 5 — Independent review

**The reviewer must never be the agent that built the thing.** An agent asked
to check its own work grades the intention, not the result.

Run the gate-review prompt in a **fresh session that has not seen the build**
([prompts/REUSABLE-PROMPTS.md](prompts/REUSABLE-PROMPTS.md)). Give it SPEC.md,
the phase prompt, the agent's report, the live link, and the latest lab results.
It must:

1. Verify the report's claims itself — open the link, run three golden cases by
   hand — and mark each claim verified, contradicted or unverifiable
2. Run the phase gate
3. Score the four judging criteria out of 10, with evidence
4. List issues by severity, each with what happens, why a judge would care, and
   a concrete fix
5. Name the single change that would most raise the total

## Human testing

Two kinds, and both find things no automated layer will:

**A native speaker per language** reads five drafts each before the demo and
marks anything unnatural. A fluent-looking draft that a native speaker finds
stilted reads the same way to a judge.

**A friend with no explanation** gets the link and has to complete a fan-out
within 60 seconds. If they ask a question, that question is the bug.

## What is deliberately not tested

- The model's wording. Taste is judged by humans; the lab judges facts.
- Exact prompt output. Pinning it would make every prompt improvement a test
  failure.
- The landing page's animation frame by frame. It is checked by screenshots at
  each scene and by the "every frame works as a still" rule.

## The order to run things at a gate

```bash
npm run test            # seconds — fails fast on the deterministic core
npm run typecheck       # seconds
npm run lint            # seconds
npm run build           # a minute
npm run lab             # minutes and real money — last, once the rest is clean
npm run audit:secrets   # after the build, since it scans .next
```

`npm run verify:all` runs the first four. The lab and the audit are separate on
purpose: one costs money, and the other needs a build to scan.
