# Phase 4 — Verify, provenance, Privacy Shield, Trust Trail, Quality Lab

**Hours 11–17.** The longest phase, and **the one that wins the accuracy
argument**. Earlier phases must keep passing.

**Goal:** the app checks its own work, visibly, and keeps a tamper-evident
record.

Split it across two sessions: Verify and provenance first, then Trust Trail and
Quality Lab.

---

## 1. The Verify step — two layers

### (a) Deterministic — already built

`lib/checker.ts`, 22 tests, **final authority**. Reuse it; do not reimplement
any part of it in a route handler or a prompt.

Catches: invented numbers, dates and names; blocked-fact leaks; a draft claiming
a fact it was never given; wrong script by Unicode range; channel breaches.

### (b) AI check — build this

Prompt already written: `VERIFY_SYSTEM` and `verifyUser` in
`lib/ai/prompts/verify.ts`. Schema already written: `VerifyAiResult`.

Returns `{ contactId, missingMustKnow[], addedClaims[], toneScore, issues[] }`.

Catches what arithmetic cannot: a fact the reader needed and did not get, a
claim smuggled in as phrasing ("as we discussed", an implied cause, a next step
nobody promised), a tone that will land badly, a greeting to the wrong name.

**If the two layers disagree, the checker wins.**

### The regeneration loop

```
compose → check (a) → check (b)
            │
            ├─ both pass ──▶ "Facts verified" badge, send enabled
            │
            └─ either fails ──▶ regenerate ONCE, with the issues listed
                                   │
                                   ├─ passes ──▶ badge, send enabled
                                   └─ fails ──▶ red panel naming exactly what is
                                                wrong, send DISABLED until the
                                                speaker edits or overrides
```

**One retry, not a loop.** A pipeline that retries until it passes eventually
talks itself into a wrong answer.

An override is allowed and is **logged in the trail** as an `override` entry.

Each passing card shows a "Facts verified" badge with a tooltip listing the
checks that ran — already in `DraftCard`.

## 2. Fact provenance

Compose already returns sentence-level mapping. Build the interaction both ways:

- Hover or tap a sentence → the `sourceSpan`s of its facts highlight in the
  original spoken text (one direction already built in `FactList`)
- Hover a span of the original → the sentences carrying it highlight

Requirements: works on **touch**, not only hover. Keyboard reachable — the
sentence list is `tabIndex={0}` and highlights on focus. A sentence carrying no
fact highlights **nothing**, rather than something plausible.

Verify it is correct for every sentence in five sampled drafts.

## 3. Privacy Shield

Spoken instructions — "don't tell X", "boss only", "keep this internal" —
become locks on facts. Extract already produces `privacy.blockedFor` and
`privacy.reason`.

Build:

- A **Privacy panel** listing every lock and who it protects against, **in the
  speaker's own words** rather than a paraphrase
- A blocked draft shown with the leaking phrase **struck through in red** (the
  checker already returns the `evidence` string for this)
- The lock visible in the Knowledge Matrix as the lock-icon cell state

The guarantee is enforced by **what Compose is handed**. Confirm that holds:
instrument the Compose prompt input and assert no blocked fact appears in it.

## 4. Trust Trail

`lib/trail.ts` is built and tested. Build the persistence and the UI.

- Persist to `trail_entries`, append-only in the application **and** the
  database (the Phase 2 migration)
- A per-update timeline view with expandable entries
- A **"Verify trail"** button that recomputes the chain: green, or **red at the
  first broken link**
- Export the trail as JSON

### The tamper test — do not skip this

1. Verify a trail. It is green.
2. **Edit one row's payload directly in the database**, as the table owner.
3. Verify again. It must turn **red at exactly that row**.

That test is what makes the badge mean something. Also test: a deleted row, an
inserted row, and a re-signed row whose successor still points at the old hash.
All four cases are already covered in `tests/trail.test.ts` at the unit level —
this is the database-level version.

## 5. Output scrub in the trail

`lib/scrub.ts` already runs in the fan-out route. Confirm it:

- runs **before** anything is displayed, saved or logged
- records in the trail **that** masking happened, not what was masked

## 6. The Quality Lab page — `/lab`

The command-line runner already exists (`scripts/quality-lab.mjs`). Build the
page.

- Stores the golden set
- **"Run all"** sends every case through the **live pipeline** — the same code
  path as the app. A lab with its own copy of the pipeline measures the wrong
  thing.
- Deterministic checks **plus** the AI grader (`GRADER_SYSTEM`), at the fixed
  `SAYONCE_GRADER_TEMPERATURE`. Never skip the deterministic half.
- A table per metric with pass/fail per case, scored against the targets
- Overall scores against targets, and a **history of runs** so improvement is
  visible rather than claimed
- Records `model` and `grader_temperature` with each run, so no score is compared
  across configurations by accident

**It must be readable by a non-technical person.** That is the point: a judge
should be able to look at it and say whether things got better.

## 7. Add the four adversarial cases

From Phase 0's golden set, now wired into the lab:

| Case | Proves |
| --- | --- |
| A thin update that invites padding | The checker catches an invented fact |
| A planted leak | The Privacy Shield catches it |
| A person named like a date ("Friday called") | No false date, and no false name flag |
| A contradiction within one update | Extract applies the correction rather than keeping both |

---

## Acceptance criteria

- [ ] **All accuracy targets met on all cases** in the Quality Lab
- [ ] A deliberately planted invented fact **and** a planted leak are both caught
- [ ] Editing a trail row directly in the database makes "Verify trail" turn red
      **at that row**
- [ ] Provenance highlights are correct for every sentence in five sampled drafts
- [ ] A failed draft's send button is **disabled**, and an override is logged
- [ ] The regeneration loop runs **once**, not repeatedly
- [ ] The Privacy panel quotes the speaker's own instruction

## Try to break it

- A very long update (60+ seconds of speech)
- Two contradictory statements with no correction cue
- A contact named like a fact ("Friday", "Monday")
- An update entirely in Hindi, in Devanagari
- An update with no facts at all ("um, yeah, so, anyway")
- A fact blocked for everyone

## Cut line

- `/lab` can be a plain table with **no run history**. The command-line runner
  already exists, so a judge still sees numbers.
- Provenance can be hover-only in one direction (sentence → source), which is
  already built.
- The trail export can be a copy-to-clipboard of the JSON rather than a download.

**Do not cut:** the checker wiring, the regeneration loop, the Privacy panel, or
the tamper test. Those four are the entry.

## Gate

Full [standard gate](PHASE-GATE.md), plus:

- [ ] Quality Lab before/after table
- [ ] Adversarial case results
- [ ] The trail tamper test result, with the row number it broke at
- [ ] Both hard gates: **zero invented facts, 100% privacy**
