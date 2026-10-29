# Phase 1 — Core pipeline, ugly but correct

**Hours 4–6.** Already built in this repo. This phase is now mostly
**verification against your own golden set**.

**Goal:** one screen where a spoken update becomes correct per-person drafts,
with zero invented facts.

---

## What already exists

| Piece | Where | Status |
| --- | --- | --- |
| Project scaffold, server route for AI calls, keys in env only | `app/`, `lib/env.ts` | built |
| Speak screen: autofocused textarea, project dropdown, Fan out, Ctrl/Cmd+Enter | `app/app/page.tsx`, `components/SpeakBox.tsx` | built |
| Extract step with the full schema | `lib/ai/extract.ts`, `lib/ai/prompts/extract.ts` | built |
| Compose step, one call per contact, parallel, allowed facts only | `lib/ai/compose.ts`, `lib/ai/prompts/compose.ts` | built |
| **The deterministic checker** | `lib/checker.ts` | built, 22 tests |
| Relative date resolution | `lib/dates.ts` | built, tested |
| Script detection | `lib/script.ts` | built, tested |
| Output scrub | `lib/scrub.ts` | built, tested |
| Trust Trail written from stage one | `lib/trail.ts`, wired in `app/api/fanout/route.ts` | built, 12 tests |
| Fact list with provenance highlight | `components/FactList.tsx` | built |
| Draft cards with verified / held-back states | `components/DraftCard.tsx` | built |
| Two demo contact sets, five sample updates | `data/demo/` | built |
| Debug visibility: facts on screen above the cards | `app/app/page.tsx` | built |

## What this phase does now

### 1. Prove it works for you

```bash
cp .env.example .env.local        # add GEMINI_API_KEY
npm install
npm run verify:all                # 90 tests, typecheck, lint, build
npm run dev
```

Open `/app`, hold your Wispr key, speak a real update. Check:

- [ ] The textarea had focus and the dictation landed with **no click**
- [ ] The facts shown above the cards are the facts you actually said
- [ ] Every number, date and name in every draft is in that fact list
- [ ] Devanagari renders properly, not in a fallback font
- [ ] Ctrl/Cmd+Enter fans out

### 2. Run your own real cases

```bash
npm run lab -- --group real
```

**This is the gate for the phase: 10 of 10 real cases with zero invented facts.**

If they do not pass, this is Phase 1 work and it comes before Phase 2. Do not
build the People Book on a pipeline that fails your own updates.

### 3. Fix what fails, at the right layer

| Symptom | Layer |
| --- | --- |
| A fact you clearly said is missing | Extract prompt |
| The provenance highlight points at the wrong words | Extract prompt — `sourceSpan` offsets |
| "parso" or "next Monday" resolved wrongly | Extract prompt; compare against `lib/dates.ts` |
| A corrected date kept both versions | Extract prompt — the corrections section |
| "dhai sau" did not become 250 | Extract prompt — the numerals section |
| A draft invented a number | Compose prompt, **or** Extract missed the fact — check which |
| A draft is in the wrong script | Compose prompt; confirm `requestedScript` reads your language label |
| The checker flagged something legitimate | `lib/checker.ts`, **with a new test** |
| A blocked fact reached a draft | A **filtering** bug, not a prompt bug. Find why the fact entered the prompt. |

That last row is the important one. A leak is never fixed by improving a prompt.

### 4. Known limitation to leave alone

Phase 1 has **no Route step**: every contact receives every fact that is not
blocked for them. That is deliberate, it is labelled `phase1-all-contacts` in
the trail, and Phase 2 replaces it.

Do not work around it by hand-filtering in the route handler. The privacy filter
stays; the routing is Phase 2's job.

---

## Acceptance criteria

- [ ] Spoken text with 3–6 facts produces facts with **correct source spans**
- [ ] Every number, date and name in every draft appears in the facts given to
      that contact, confirmed by the checker
- [ ] A blocked fact never appears in a blocked contact's **input or output**
- [ ] Relative dates resolve correctly; mid-sentence corrections apply
- [ ] Works on a 360 px screen
- [ ] `npm run test` passes — and any checker change you made has a new test

## Cut line

Nothing to cut. This phase is already built; the only work is verification and
fixes against your own data. If your real cases pass on the first run, bank the
time and move to Phase 2.

## Gate

The full [standard gate](PHASE-GATE.md), with this phase's accuracy target:

- [ ] `npm run lab -- --group real` — **10/10, zero invented facts**
- [ ] `npm run lab` — the full set, recorded as the baseline every later phase
      must not fall below

Report the full-set baseline even where it is below target. Phases 2 and 4 are
what bring routing and must-know coverage up; knowing the starting number is how
you will know they worked.
