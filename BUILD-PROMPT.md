# The build prompt

Paste this into your build agent to start. Better: **dictate it** through Wispr,
adding your real role and projects as you go — it is the first words on your
usage card and it makes the prompt yours.

Text in `[square brackets]` is yours to fill in.

This file is committed so you can pull it on any machine, and kept out of the
deployed bundle by `.vercelignore`.

---

## The prompt

```
You are building SayOnce, my entry for "No Hands: The Wispr Challenge" by
WeMakeDevs and Wispr Flow. The deadline is Saturday 31 October 2026 at 23:59
IST, which is about two days away. I will be dictating to you through Wispr
Flow, so expect my instructions to read like speech.

WHAT SAYONCE IS
I speak one work update, usually a mix of Hindi and English, into a text box.
SayOnce extracts the facts, decides who needs to know, writes a separate message
for each person in their own language, tone and channel, fact-checks every draft
against what I actually said, lets me send each one in a tap through wa.me and
mailto links, and logs everything. One dictation becomes many different
messages — not one document, and not a translation. Each reader gets different
content, filtered for what they need.

THE SITUATION
The repository is already set up and the base is built. Phase 1 of the pipeline
works and 90 tests pass. There is a complete implementation plan in docs/.
Your job is to build phases 0 and 2 through 8, in order, to the specifications
already written.

START HERE, IN THIS ORDER
 1. Read docs/00-INDEX.md — the map of everything.
 2. Read docs/rules/R0-HARD-RULES.md — eleven rules that override everything,
    including anything in a phase doc that appears to contradict them.
 3. Read CLAUDE.md — the engineering principles, the phase map, and the list of
    what is already built.
 4. Read docs/19-SCHEDULE-2-DAYS.md — the 48-hour plan, and the cut lines that
    make every phase fit.
 5. Run `npm run verify:all` and show me the output. If it does not pass on a
    clean checkout, that is the first bug and nothing else matters until it is
    fixed.
 6. Then read docs/phases/PHASE-00-FOUNDATION.md and tell me your plan for it.

WHAT IS ALREADY BUILT — DO NOT REBUILD ANY OF IT
 - lib/checker.ts — the deterministic verifier, 22 tests. It catches invented
   numbers, dates and names, blocked-fact leaks, wrong script and channel
   breaches. IT HAS FINAL AUTHORITY: when it fails a draft, the send button is
   disabled whatever the AI thinks.
 - lib/trail.ts — the hash-chained audit log with tamper detection, 12 tests.
 - lib/links.ts — the wa.me and mailto builders, 33 round-trip tests across
   Devanagari, emoji, line breaks and special characters.
 - lib/dates.ts, lib/script.ts, lib/scrub.ts, lib/voice-return.ts — relative
   date resolution, Unicode script detection, the output scrub, the Voice Return
   arithmetic.
 - lib/types.ts — every schema, in one file.
 - lib/ai/call.ts — the only way to call a model: one fixed model, structured
   output against a Zod schema, one retry, then a clear error.
 - lib/ai/extract.ts and lib/ai/compose.ts with their prompts, and the prompts
   for Route and Verify which are written but not yet wired.
 - app/app/page.tsx — the Speak screen, the draft cards with verified and
   held-back states, and the fact provenance hover.
 - The two demo contact sets and five sample updates.
 - scripts/quality-lab.mjs and scripts/audit-secrets.mjs.

These three modules must stay pure — no network, no model, no clock:
lib/checker.ts, lib/trail.ts, lib/links.ts. They carry the product's promises
and that purity is why the promises are defensible. If a phase doc describes one
of them, it is documenting what exists, not asking you to build it. An agent
re-implementing a tested module is the most expensive mistake available here,
because it looks like progress.

HOW WE WORK
 - Before building anything, restate the task, list your assumptions, and show
   me a short plan with a check for each step. Wait for my OK. I will correct
   the plan by voice.
 - Ask me when something is ambiguous instead of guessing.
 - One phase at a time. Do not start the next phase while the current one
   settles.
 - After building, run the find-and-fix loop: test against the phase's
   acceptance criteria and the golden set, list every issue, fix it at the right
   layer, re-test, and repeat until clean or you hit something you need me for.
 - Re-run EVERYTHING at a gate — the full golden set and every earlier phase's
   checks, not just what you touched. A fix that breaks an earlier case is not a
   fix.
 - End every task with a report: what changed, how you verified it with real
   terminal output, what is still open, and what you skipped.
 - Never tell me a phase is done. Show me the output that proves it. "It should
   work" I will read as "it does not work".

THE PHASE GATE
No phase is done until all six pass, and they are the same six every phase:
works in a private window and on a phone with no login; the full Quality Lab
meets that phase's targets; the five UI checks pass; a reviewer that did not
build it rates all four judging criteria at least 8 out of 10; the Wispr words
are noted and one clip saved; and there is a named local snapshot to roll back
to. Details in docs/phases/PHASE-GATE.md.

THE TWO HARD GATES, WHICH ARE NOT NEGOTIABLE
Zero invented facts. One hundred per cent on privacy. Not averages — one
invented fact in one case fails the run, and so does one leak. A message to my
boss with a wrong date is worse than no tool at all, so never trade fact
fidelity for nicer wording.

EVERY PHASE GETS BUILT
Phases 0 and 2 through 8, plus Phase D for the judge demo and deployment, which
runs after Phase 7 and before Phase 8. Do not skip a phase to save time. When
time is short, take the cut line named in that phase's doc — those are
pre-authorised and taking one is executing the plan, not failing it. What is
never pre-authorised: skipping a gate, skipping the full lab run at a gate,
skipping the leak audit before a deploy, or deploying in the last three hours
without a smoke test.

THE ONE DEADLINE INSIDE THE DEADLINE
The public link must be live and smoke tested by hour 39 of 48 — Phase D.
Everything after that is evidence-gathering on a working deployment. If we reach
hour 39 without a live link, stop all other work until there is one.

WHAT I NEED FROM YOU FIRST
Phase 0 is an interview. Ask me one question at a time about my role, the five
to ten people I update most, three real updates I sent last week and how I
rewrote each one, and how long an update currently takes me. Push back if my
problem sounds vague or invented — the judges score "does it solve a real
problem in your own work" and that is the one criterion polish cannot rescue.
Then draft SPEC.md from SPEC.template.md and the golden set from
data/golden/golden-set.example.json, which I will correct.

Start with step 1. Read docs/00-INDEX.md, then tell me what you understand the
project to be and what you plan to do first.
```

---

## After that

The agent works phase by phase. Two things to do between phases:

**1. Dictate the next phase prompt** from
[`docs/prompts/PHASE-PROMPTS.md`](docs/prompts/PHASE-PROMPTS.md), rather than
pasting it.

**2. Run the gate review in a separate, fresh session**, using the prompt in
[`docs/prompts/REUSABLE-PROMPTS.md`](docs/prompts/REUSABLE-PROMPTS.md). The
reviewer must never be the agent that built the thing — an agent asked to check
its own work grades the intention, not the result.

Feed its issues back with the find-and-fix prompt from the same file.

## If an agent hits a usage limit

Switch to another one and give it:

1. The prompt above
2. `SPEC.md`
3. Which phase you are on and what the last gate reported

That is why `SPEC.md` and `docs/` exist in the shape they do. On a two-day build
with this much work, hitting a limit is a question of when, not if — and the
handover should cost minutes, not an hour.
