# Phase 5 — Update Log, learning, Consistency Guard, commitments, Voice Return

**Hours 24–28.** Earlier phases and the Quality Lab must keep passing.

**Goal:** memory. The record that writes itself, drafts that improve with use,
and protection against contradicting yourself.

This is the phase that makes SayOnce a tool you keep rather than a tool you
try — which is exactly what criterion 1 asks for.

---

## 1. Update Log — `/log`

Every update with:

date · project · one-line summary · decisions · recipients · sent status per
message · a link to its Trust Trail

- Filter by person, project and date
- Search across the raw text and summaries
- **CSV export**

This is the "record nobody used to keep" claim, so it has to look like a record:
dense, scannable, sorted newest first. Not a feed of cards.

## 2. Voice feedback that sticks

Under each card: a textarea, "Tell SayOnce what was wrong".

You dictate:

> "Too formal for Ramesh, he hates long messages."

The AI turns it into a **proposed profile change** — `formality: casual`,
`learnedRules: ["keep to three lines", "no greetings"]` — which you accept or
reject.

- Accepted changes are **versioned** on the contact (`profile_version`) and
  recorded in the trail as a `profile-change` entry
- Future drafts for that contact use the updated profile. `composeUser` already
  accepts `learnedRules`; wire it up.
- A rejected proposal is also logged, so a pattern of rejections is visible

**Acceptance test:** after five accepted feedback rounds on one contact, three
fresh updates must produce drafts that follow **every** accepted rule. Not most.

This is the most alive-feeling moment in the demo. A judge watching a tool learn
from a spoken sentence remembers it.

## 3. Consistency Guard

Before showing drafts, compare the new facts with what each recipient was told
before, on the **same project**, in the **last 30 days**.

If a date, quantity, price or decision changed:

> "Last Tuesday you told Ramesh delivery is Friday; this says Monday. Add a
> correction line?"

Three options, all logged as a `consistency-choice` trail entry:

1. **Add the correction** — "Update: delivery moves from Friday to Monday". Built
   from the two facts only; no new information.
2. **Ignore**
3. **Mark the earlier fact superseded**

**Acceptance test:** catches **5 of 5** planted contradictions, and raises **no
false alarm** on 5 consistent follow-ups.

That second half matters more than the first. A guard that cries wolf gets
dismissed, and a dismissed guard is worse than no guard.

## 4. Commitments

Extract already tags `commitment` facts. Store them with owner, due date and
status (`facts.commitment_owner`, `_due`, `_status`).

- A Commitments view listing open items
- For items **others owe you**, one click drafts a polite follow-up in their
  language and channel — reusing Compose, with the commitment as the fact

**Acceptance test:** commitments extracted correctly from five test updates,
with the right owner and the right due date.

## 5. Voice Return meter

`lib/voice-return.ts` is built and tested. Wire it up:

- **Per update**, on the results screen: words spoken, words delivered, people,
  languages, minutes saved
- **Per week**, as a card

Minutes saved needs two measured inputs:

- `SAYONCE_BASELINE_MINUTES` — your Phase 0 measurement
- `updates.elapsed_seconds` — **measured by the app**, from opening Speak to the
  last send. Instrument this now; it cannot be reconstructed later.

**Shown as nothing, not as a guess, until both exist.** Never negative.

**Acceptance test:** the numbers match a hand calculation for three updates.

## 6. "Who did I forget?"

If a contact usually receives updates for this project — **3 of the last 5** —
but is not selected, show a gentle warning with their name and that fact.

Gentle is the operative word. It is a nudge beside the recipient list, not a
modal.

---

## New golden group

Write the planted-contradiction and commitment test cases into the golden set as
a new group, then **run the full lab**.

| Case type | Count |
| --- | --- |
| Planted contradiction with an earlier update | 5 |
| Consistent follow-up that must **not** alarm | 5 |
| Commitment extraction with owner and due date | 5 |

The contradiction cases need two updates each — the earlier one seeded into the
log. Make that setup part of the case, not a manual step.

---

## Acceptance criteria

- [ ] After five accepted feedback rounds, new drafts follow **every** accepted
      rule, tested with three fresh updates
- [ ] Consistency Guard: 5/5 contradictions caught, **0/5 false alarms**
- [ ] Commitments correct from five test updates — right owner, right due date
- [ ] Voice Return matches a hand calculation for three updates
- [ ] Every sent message has a trail entry; the log and the trail agree
- [ ] CSV export opens in a spreadsheet with the columns intact
- [ ] `npm run lab` — the full set, every target still met

## Cut line

- **Commitments tracker** — the whole feature. Extract already tags the facts, so
  it can be added later without rework.
- **Weekly digest** — not in the acceptance criteria above for this reason.
- The Commitments follow-up drafting, keeping just the list.

**Keep:** the Update Log, the voice feedback loop, and Voice Return. The first
is the "record writes itself" claim, the second is the demo's best moment, and
the third is its closing shot.

## Gate

Full [standard gate](PHASE-GATE.md), plus:

- [ ] The new golden group's results
- [ ] Full lab results
- [ ] Evidence of the five-round feedback test — the three fresh drafts, with the
      accepted rules listed beside them
