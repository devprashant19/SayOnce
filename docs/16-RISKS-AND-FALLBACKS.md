# Risks and fallbacks

## The biggest risk

**Criterion 1.** If your own work does not actually involve updating several
people in several languages, the problem will look invented — and no amount of
polish recovers it. Judges are explicitly told to look for "a real problem in
your own work".

Decide this in the first hour of Phase 0, honestly. If the answer is no, switch
to a backup below rather than building a beautiful tool for a problem you do
not have.

## Risk table

| Risk | Likelihood | Fallback |
| --- | --- | --- |
| Your work has few stakeholders | — | Switch to a backup idea below, immediately |
| A build agent hits a usage limit | high on a 2-day build | Switch to another agent. `SPEC.md` plus these docs carry the full context across, which is the reason they exist |
| The AI invents facts in a draft | medium | Already handled: the deterministic checker holds the draft back. If it gets through, the failure is in the checker and gets a regression test |
| Hindi or regional output is weak | medium | A language field per contact, plus a native speaker reading five drafts per language before recording. Fix via the prompt, then re-run the full lab |
| Low Wispr usage on the card | medium | Dictate the golden set — 34 spoken updates is the single biggest block of words, and it is work you need anyway |
| The fan-out is slow on camera | medium | Record on a warm cache; cached samples make the demo path instant |
| Serverless timeout on a large fan-out | medium | Batch the Compose calls rather than raising the ceiling. A 90-second request is a bad demo even when it succeeds |
| Judges hit the AI during an outage | low | `DEMO_LIVE_AI=off` plus cached samples keeps the whole guided path working |
| Cost runs away on a public endpoint | low | Per-session and daily caps, already designed in |
| A late "small improvement" breaks production | **high** | Freeze deploys in the last day. Promote the last good deployment from `ROLLBACK.md` |
| Devanagari renders in a fallback font | medium | `"Noto Sans Devanagari"` is in the font stack. Check it on screen at every gate |
| A real phone number reaches the public build | low but fatal | `npm run audit:secrets` gates the deploy |
| Running out of time | **certain** | Cut inside phases, never cut a phase. Each phase doc has a "cut line" |

## Running out of time: what to cut

The instruction is that every phase gets built. So cutting happens **inside**
phases. Each phase doc names its own cut line; the global order is:

1. **Landing page polish** (Phase 7) — the scroll story degrades to three
   scenes and still works
2. **Commitments tracker, weekly digest, script toggle** (Phase 5/6 optional)
3. **The voice command bar** (Phase 6) — great on camera, not load-bearing
4. **Knowledge Matrix interactivity** — static grid instead of live
5. **Golden set size** — 34 → 20, keeping all 10 real and all 4 adversarial

**Never cut:**

- the deterministic checker, or any of its tests
- the Privacy Shield
- the Trust Trail
- the judge demo with cached samples
- two days of real use
- the leak audit before deploy

Those five are the entry. Everything else is presentation.

## Backup ideas

Same voice-first shape, same architecture, same accuracy system — if your real
work does not fit SayOnce.

### Promise Ledger

At the end of the day you talk through what you promised whom and what others
owe you. It keeps a two-sided ledger and drafts polite reminders in each
person's language, becoming firmer on the second and third nudge.

**What carries over:** Extract (commitment facts are already a type), the
contact profiles, the per-person language and channel, the deterministic
checker, wa.me/mailto, the Trust Trail. Roughly 70% of this repo.

**What changes:** Route becomes "whose promise is this", and Compose becomes
escalating reminder drafts instead of per-reader updates.

### Formal Drafting Desk

You describe a grievance or request casually. It produces the correct formal
document — a bank complaint, an RTI application, a vendor dispute letter — with
a checklist of attachments.

**What carries over:** Extract, the checker (zero invented facts matters even
more here), the scrub, the trail.

**What changes:** no fan-out, no contacts. One document instead of many
messages, which makes it a weaker entry against the "different shape" argument —
the official examples are full of one-dictation-one-document tools. Pick this
only if the problem is genuinely yours.

## Decision points

Three moments where it is worth stopping to check rather than pushing on:

| Hour | Question | If no |
| --- | --- | --- |
| ~1 | Is this a real problem in my own work, with 5+ real contacts across 2+ languages? | Switch to a backup now |
| ~20 | Do 10 of 10 real golden cases pass with zero invented facts? | Stop adding features. Fix the pipeline |
| ~40 | Is the deployed link working in a private window on a phone with no login? | Stop everything else until it is |

A no at hour 40 that is discovered at hour 47 is the difference between an
entry and no entry.
