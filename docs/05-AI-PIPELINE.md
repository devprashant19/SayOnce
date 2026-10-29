# The AI pipeline

Four model calls, each with a schema it cannot escape. Prompts live in
`lib/ai/prompts/`; steps in `lib/ai/`; the one call wrapper in `lib/ai/call.ts`.

## The call wrapper

Everything goes through `aiCall()`. It:

- uses the one fixed model from `SAYONCE_MODEL` (default `gemini-2.5-flash`)
- converts the step's Zod schema to a Gemini-safe JSON Schema and sends it as
  `responseJsonSchema`, so decoding is constrained rather than hoped for
- validates the response with the same Zod schema on the way back
- retries exactly once on an unusable response, stating what was wrong
- throws a message a person can act on, rather than returning an empty result

### The schema translation

`lib/ai/schema.ts` does one job and it is load-bearing: Gemini accepts only a
documented subset of JSON Schema, and Zod emits keywords outside it (`pattern`,
`default`, `minLength`, `propertyNames`, `$schema`). Sending one is a 400 on
the first call of a run.

So the generated schema is pruned to the supported subset, and **Zod still
validates the response afterwards** — which is where the rules that cannot be
expressed to Gemini are actually enforced: the E.164 phone pattern, the ISO
date shape, string lengths.

> The schema constrains the shape. Zod enforces the contract.

`tests/schema.test.ts` asserts that every pipeline step's schema emits only
supported keywords, so a rejected schema is caught offline rather than live.

**Why an empty result is forbidden:** an empty fact list looks like "nothing to
say" and would silently drop half an update. A loud failure is recoverable; a
quiet one is not.

### On determinism

Gemini accepts `temperature`, so the grader runs at **0** and the pipeline runs
**low** (0.2 by default). Repeatability rests on four things:

1. `SAYONCE_GRADER_TEMPERATURE=0`, which must not move during the build
2. a frozen prompt (editing one mid-run invalidates the comparison)
3. a schema that constrains decoding
4. one fixed model

The pipeline is deliberately not at 0: composing a message that reads naturally
needs a little latitude, and the facts are protected by the checker rather than
by determinism. The *grader* has no such need, so it gets none.

Record the model and the temperature with every run (`lab_runs.model`,
`lab_runs.grader_temperature`) so a score is never compared across
configurations by accident.

## Stage 1 — Extract

`lib/ai/extract.ts` · `lib/ai/prompts/extract.ts`

**In:** the raw spoken text, the day it was spoken, the time zone, the contact
roster (for privacy matching only — not for routing).

**Out:** `ExtractResult`

```ts
{
  facts: [{
    id, text, type,
    values: { numbers[], datesIso[], names[] },
    sourceSpan: { start, end },
    privacy: { blockedFor[], reason }
  }],
  correctionsApplied: [{ from, to, note }],
  summary, decisions[]
}
```

The only step that reads the speaker's words. A fact lost here is lost for
good; a fact invented here poisons every draft. The prompt therefore prefers
**many small facts over few large ones** — one fact is one thing a reader could
act on or be wrong about.

Four things it must get right:

| Requirement | Why it matters |
| --- | --- |
| `sourceSpan` is exact character offsets | It drives the provenance highlight. Off by ten and the feature is visibly broken. `extract.ts` clamps out-of-range spans rather than rejecting the fact. |
| Relative dates resolved to ISO | "parso", "kal", "next Monday". Resolved against `spokenOn`, with the spoken phrase kept in the fact text. `lib/dates.ts` is the deterministic reference it is graded against. |
| Mid-sentence corrections applied | "Tuesday, no wait, Wednesday" keeps **Wednesday only**. Leaving both in is a correctness failure, not a style one. |
| Numbers spoken in another language converted | "dhai sau" → 250, "do hazaar" → 2000. The digits go in `values.numbers`; the spoken form stays in the text. |

**Privacy, when it is ambiguous:** if the speaker's instruction cannot be
matched to specific contacts, block the fact for *everyone* and say why in the
reason. A fact wrongly withheld is recoverable in one tap; a fact wrongly
leaked is not recoverable at all.

## Stage 2 — Route

`lib/ai/prompts/route.ts` · built in Phase 2

**In:** the facts, every contact, the project, and who usually hears about that
project.

**Out:** `RouteResult`

```ts
{
  decisions: [{ contactId, include, reason, confidence, factIds[] }],
  concernsNobody: boolean
}
```

This is the step that makes SayOnce a fan-out rather than a translator: it
decides *what each person needs to know*, not just how to phrase it.

| Rule | Detail |
| --- | --- |
| Never pad | An update that concerns nobody sets `concernsNobody` and returns everyone with `include: false`. A forced recipient list is a failure; golden case `g_tricky_02` exists to catch it. |
| `reason` is checkable in two seconds | "Affected by the update" is not a reason. "The delivery date he quoted the warehouse has moved" is. |
| `confidence` is honest | Below 0.6 is shown unticked with a "check this" tag. An honest low number is more useful than a confident wrong one. |
| `factIds` respects both kinds of block | Spoken privacy tags *and* the contact's standing `never_tell`. |

Phase 1 ships a stand-in: everyone gets every non-blocked fact. Phase 2 replaces
it. The privacy filter stays either way.

## Stage 3 — Compose

`lib/ai/compose.ts` · `lib/ai/prompts/compose.ts`

Runs **once per selected contact, in parallel**, and receives **only** that
contact's allowed facts.

**Out:** `Draft`

```ts
{ contactId, channel, subject?, body, usedFactIds[], sentences: [{ sentence, factIds[] }] }
```

Two things the model is not allowed to choose:

- **`contactId`** comes from our own loop. A model that mislabels which reader a
  draft is for would send the boss's version to the vendor.
- **`channel`** comes from the contact profile.

| Rule | Detail |
| --- | --- |
| Only the facts given | Every number, date, name and place must appear in them. No "as discussed yesterday", no invented time of day, no next step nobody promised. |
| Language and script exactly as the profile asks | "Hindi, Devanagari" means Devanagari characters. "Hinglish" means Hindi and English mixed in Roman letters. |
| `sentences` must be honest | It is shown to the speaker as hover highlights. A greeting maps to an empty list; a sentence carrying a fact must name it. |
| Say less rather than padding | A fact that does not matter to this reader may be left out. `cares_about` is a priority instruction, not a filter. |
| Channel rules enforced here, not after | WhatsApp: no subject, under 700 characters, plain text — no markdown, which WhatsApp renders literally. Email: a subject under 70 characters. |

`composeAll()` uses `Promise.allSettled`, so one failed draft shows an error on
its own card instead of killing the whole fan-out.

## Stage 4 — Verify

Two layers, in this order, and the order is the point.

### (a) Deterministic — `lib/checker.ts`

No model. Pure functions. 22 tests. **Final authority.**

| Check | What it catches |
| --- | --- |
| `invented-number` | A digit group, or a numeral spoken as a word, that is not in the allowed facts |
| `invented-date` | A date in any of four written shapes that is not in the facts, compared day-for-day |
| `invented-name` | A capitalised name not in the facts and not the recipient's own. Weekdays, months and sentence-starting words are excluded. |
| `blocked-fact-leak` | A withheld fact present by one of its hard values, or by 60%+ of its content words |
| `unused-fact-claimed` | A `usedFactIds` entry the draft was never given |
| `wrong-script` | Devanagari asked for, Latin delivered — or the reverse. By Unicode range. |
| `missing-subject`, `subject-too-long`, `body-too-long`, `markdown-in-whatsapp`, `empty-body` | Channel breaches |

When this fails a draft, the send button is **disabled** no matter what the AI
layer said. Sending anyway requires an explicit human override, which is logged
in the trail.

Two deliberate design choices worth preserving:

- **An unrecognised language returns no script requirement**, rather than a
  failure. A wrong block on a language we do not model would be worse than no
  check.
- **A capitalised word that only ever starts a sentence is not a name.**
  Hinglish drafts open lines with "Baaki", "Kal", "Aaj" constantly. A false
  block costs more than a missed name, because layer (b) still reads for
  smuggled claims.

### (b) AI — `lib/ai/prompts/verify.ts`, Phase 4

**Out:** `VerifyAiResult`

```ts
{ contactId, missingMustKnow[], addedClaims[], toneScore, issues[] }
```

Catches what arithmetic cannot: a fact the reader needed and did not get, a
claim smuggled in as phrasing ("as we discussed", an implied cause), a tone
that will land badly, a greeting to the wrong name.

**If the two layers disagree, the checker wins.**

### The regeneration loop

```
compose → check (a) → check (b)
            │
            ├─ both pass ──▶ "Facts verified" badge, send enabled
            │
            └─ either fails ──▶ regenerate ONCE with the issues listed
                                   │
                                   ├─ passes ──▶ badge, send enabled
                                   └─ fails ──▶ red panel naming exactly what is
                                                wrong, send DISABLED until the
                                                speaker edits or overrides
```

One retry, not a loop. A pipeline that retries until it passes is a pipeline
that eventually talks itself into a wrong answer.

## The grader

`GRADER_SYSTEM` in `lib/ai/prompts/verify.ts`, used by the Quality Lab only.

Kept separate from the in-app Verify step because it grades against the golden
set's **recorded expectations**, not against its own judgement of what matters.
It runs at a fixed effort and must cite the sentence it judged on.

Mix exact checks with AI-graded ones: anything a plain function can check is
checked by a plain function (`scripts/quality-lab.mjs` does the deterministic
half today), and only meaning-level judgements go to the grader.

## Cost shape

Per fan-out of five contacts: 1 Extract + 1 Route + 5 Compose + 5 Verify = 12
calls. A 34-case Quality Lab run is therefore several hundred calls.

`gemini-2.5-flash` is the default partly for this reason: a full lab run stays
cheap enough to do at every gate, which is the only way the targets mean
anything. If extraction quality is the bottleneck — particularly exact source
spans — switch `SAYONCE_MODEL` to `gemini-2.5-pro` and re-run the full set so
the before and after stay comparable.

Three consequences, all of them already designed in:

1. **Demo samples are cached.** The guided judge path makes zero live calls.
2. **Live AI on visitor-typed text is capped** per session and per day, with a
   `DEMO_LIVE_AI` kill switch.
3. **Run the lab by group during the build** (`npm run lab -- --group tricky-instruction`)
   and the full set only at a gate.
