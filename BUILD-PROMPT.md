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
IST, about two days away. I will be dictating to you through Wispr Flow, so
expect my instructions to read like speech.

WHAT SAYONCE IS
I speak one work update, usually a mix of Hindi and English, into a text box.
SayOnce extracts the facts, decides who needs to know, writes a separate message
for each person in their own language, tone and channel, fact-checks every draft
against what I actually said, lets me send each one in a tap through wa.me and
mailto links, and logs everything. One dictation becomes many different
messages — not one document, and not a translation. Each reader gets different
content, filtered for what they need.

THE SITUATION
The repository is set up, the base is built, and 118 offline tests pass. There
is a complete implementation plan in docs/. Your job is to build phases 0 and 2
through 9, in order, to the specifications already written.

The repo is github.com/devprashant19/SayOnce, private, with origin already
configured. You commit and push as you work — details under GIT below.

START HERE, IN THIS ORDER
 1. Read docs/00-INDEX.md — the map of everything.
 2. Read docs/rules/R0-HARD-RULES.md — eleven rules that override everything,
    including anything in a phase doc that appears to contradict them.
 3. Read docs/rules/R8-GIT-DISCIPLINE.md — how we commit. Then run
    `git config commit.template .gitmessage` once.
 4. Read CLAUDE.md — the engineering principles, the phase map, and the list of
    what is already built.
 5. Read docs/19-SCHEDULE-2-DAYS.md — the 48-hour plan, and the cut lines that
    make every phase fit.
 6. Run `npm run verify:all` and show me the output. If it does not pass on a
    clean checkout, that is the first bug and nothing else matters until it is
    fixed.
 7. Run `npm run smoke:ai` to confirm my Gemini key works, then
    `npm run test:live` to watch the real pipeline produce real drafts.
 8. Then read docs/phases/PHASE-00-FOUNDATION.md and tell me your plan for it.

WHAT IS ALREADY BUILT — DO NOT REBUILD ANY OF IT
 - lib/checker.ts — the deterministic verifier, 22 tests. It catches invented
   numbers, dates and names, blocked-fact leaks, wrong script and channel
   breaches. IT HAS FINAL AUTHORITY: when it fails a draft, the send button is
   disabled whatever the AI thinks.
 - lib/trail.ts — the hash-chained audit log with tamper detection, 12 tests.
 - lib/links.ts — the wa.me and mailto builders, 33 round-trip tests across
   Devanagari, emoji, line breaks and special characters.
 - lib/ai/schema.ts — Zod to Gemini JSON Schema, pruned to the keywords Gemini
   actually accepts, 28 tests. Never hand-write a schema; call geminiSchema().
 - lib/ai/call.ts — the only way to call a model: one fixed model, output
   constrained by a schema, Zod validation on the way back, one retry, then a
   clear error.
 - lib/dates.ts, lib/script.ts, lib/scrub.ts, lib/voice-return.ts — relative
   date resolution, Unicode script detection, the output scrub, the Voice Return
   arithmetic.
 - lib/types.ts — every schema, in one file.
 - lib/ai/extract.ts and lib/ai/compose.ts with their prompts, and the prompts
   for Route and Verify, which are written but not yet wired.
 - app/app/page.tsx — the Speak screen, the draft cards with verified and
   held-back states, and the fact provenance hover.
 - The two demo contact sets and five sample updates.
 - scripts/quality-lab.mjs, scripts/audit-secrets.mjs, scripts/smoke-ai.mjs.

These three modules must stay pure — no network, no model, no clock:
lib/checker.ts, lib/trail.ts, lib/links.ts. They carry the product's promises
and that purity is why the promises are defensible. If a phase doc describes one
of them, it is documenting what exists, not asking you to build it. An agent
re-implementing a tested module is the most expensive mistake available here,
because it looks like progress.

GIT — COMMIT AS YOU WORK
 - You may commit and push WITHOUT ASKING, for any change that passes
   `npm run check`. No permission needed per commit. Do not wait for me.
 - Commit after EVERY fix, not at the end of a phase. One logical change, one
   commit. On a two-day build, small commits are what make `git bisect` able to
   find the prompt change that broke three golden cases six hours later.
 - The loop is: `npm run check` (about 20 seconds), then add, commit, push.
 - Conventional Commits: type(scope): summary in the imperative, under 72
   characters, then a body explaining WHY. Scopes are listed in .gitmessage.
 - Name the golden case or test a fix fixes: "Fixes g_tricky_01, which kept
   both Tuesday and Wednesday." That one line is worth more than a paragraph.
 - When a change moves a metric, put the before and after in the body:
   "Routing recall 0.82 -> 0.94 on the full set."
 - Never commit a red state to main. Broken work goes on the phase branch with
   type `wip` and is fixed before the merge.
 - One branch per phase: phase/02-people-book, phase/04-verify-and-lab, and so
   on. At the gate, when all six gate items pass: run verify:all and the full
   lab, merge to main with --no-ff, tag it phase-NN-gate with the lab headline
   numbers in the message, and push with --follow-tags.
 - Fixes the gate review finds go on the phase branch, before the merge.
 - ASK ME FIRST for exactly three things, because a later commit cannot undo
   them: force-pushing, hard reset or git clean, and removing files from the
   repo. Everything else, proceed.
 - Never commit SPEC.md, the golden set, .env files or ROLLBACK.md. They hold
   real names, real phone numbers and keys. Run `npm run audit:secrets` before
   any push that follows a build, and always before a deploy.

HOW WE WORK
 - Before building anything, restate the task, list your assumptions, and show
   me a short plan with a check for each step. Wait for my OK. I will correct
   the plan by voice.
 - Ask me when something is ambiguous instead of guessing.
 - One phase at a time. Do not start the next phase while the current one
   settles.
 - After building, run the find-and-fix loop: test against the phase's
   acceptance criteria and the golden set, list every issue, fix it at the right
   layer, commit the fix, re-test, and repeat until clean or you hit something
   you need me for.
 - Re-run EVERYTHING at a gate — the full golden set and every earlier phase's
   checks, not just what you touched. A fix that breaks an earlier case is not a
   fix.
 - End every task with a report: what changed, how you verified it with real
   terminal output, the commits you made, what is still open, and what you
   skipped.
 - Never tell me a phase is done. Show me the output that proves it. "It should
   work" I will read as "it does not work".

THE PHASE GATE
No phase is done until all six pass, and they are the same six every phase:
works in a private window and on a phone with no login; the full Quality Lab
meets that phase's targets; the five UI checks pass; a reviewer that did not
build it rates all four judging criteria at least 8 out of 10; the Wispr words
are noted and one clip saved; and the phase is merged and tagged. Details in
docs/phases/PHASE-GATE.md.

THE TWO HARD GATES, WHICH ARE NOT NEGOTIABLE
Zero invented facts. One hundred per cent on privacy. Not averages — one
invented fact in one case fails the run, and so does one leak. A message to my
boss with a wrong date is worse than no tool at all, so never trade fact
fidelity for nicer wording.

EVERY PHASE GETS BUILT
Phases 0 and 2 through 9, plus Phase D for the judge demo and deployment, which
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

THE LAST STEP
After the entry is submitted, and only then, Phase 9 cleans up the repository:
the phase plans, the dictatable prompts, the schedule and this prompt existed to
get the thing built, and once it is built they are process archaeology. STOP AND
ASK ME before removing anything — show me the exact list, with your
recommendation of what to keep and what to drop, and wait for my answer. That is
the one place where your standing authorization to commit and push does not
apply.

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

## The commit cadence, in practice

What a healthy hour of this build looks like in `git log`:

```
fix(extract): resolve parso forwards instead of backwards
fix(extract): keep only the corrected date after a mid-sentence change
test(checker): cover a contact named like a weekday
feat(route): add the Route step between Extract and Compose
fix(route): stop padding the recipient list when nothing is affected
perf(compose): drop the redundant history block from the prompt
```

Six commits, each one runnable, each one explaining itself. If an hour produces
a single commit called `phase 2`, the discipline has slipped — and the cost
shows up later, when something breaks and there is nothing to bisect.

## If an agent hits a usage limit

Switch to another one and give it:

1. The prompt above
2. `SPEC.md`
3. `git log --oneline -20`, and which phase branch you are on

That is why `SPEC.md`, `docs/` and small commits exist in the shape they do. On
a two-day build with this much work, hitting a limit is a question of when, not
if — and the handover should cost minutes, not an hour.
