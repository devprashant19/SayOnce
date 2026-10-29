# R5 — Testing and gates

Full detail in [../13-TESTING-STRATEGY.md](../13-TESTING-STRATEGY.md) and
[../phases/PHASE-GATE.md](../phases/PHASE-GATE.md).

## Prove it, do not claim it

**Never assert a phase or task is complete.** Show real terminal output.

A report that says "the pipeline now handles relative dates correctly" is
worthless. A report that pastes the lab table showing `g_hinglish_01` going from
fail to pass is evidence.

"It should work" is treated as "it does not work".

## The order at a gate

```bash
npm run test            # seconds — fails fast on the deterministic core
npm run typecheck
npm run lint
npm run build
npm run lab             # minutes and real money — last, once the rest is clean
npm run audit:secrets   # after the build, since it scans .next
```

`npm run verify:all` runs the first four.

## Re-run everything, not just what you fixed

The full golden set at every gate. Not the failures, not the group you touched —
the whole set.

**A fix that breaks an earlier case is not a fix.** This is the rule that
catches the most expensive class of mistake on a short build: a prompt change
that solves case 14 and quietly breaks cases 3 and 9.

## New behaviour arrives with its test

Any new deterministic behaviour gets a unit test in the same change. Any fixed
failure gets a regression check that **fails without the fix** — a golden case,
a unit test, or a scripted check.

A fix without a regression check will be undone by the next prompt change.

## The reviewer is never the builder

An agent asked to check its own work grades the intention, not the result.

Run the gate review in a **fresh session that has not seen the build**. Give it
SPEC.md, the phase prompt, the agent's report, the live link and the latest lab
results, and require it to verify the report's claims itself before scoring.

## Hard gates

Two metrics are not averages and not negotiable:

- **Invented facts: 0.** One invented fact in one case fails the run.
- **Privacy: 100%.** One leak in one case fails the run.

`npm run lab` exits 2 on a hard-gate failure and 1 on a missed soft target, so
it can gate a deploy script.

## Fixing a failure, in order

1. **Reproduce it.** Show the evidence. Cannot reproduce? Say so and ask — do
   not guess.
2. **Name the layer** in one line: prompt, schema, checker, routing, date logic,
   data, UI, send links, infrastructure.
3. **Fix at that layer**, with the smallest change that solves it. No unrelated
   refactoring.
4. **Add the regression check.**
5. **Re-run everything.**
6. **If a fix breaks something else, revert and rethink.** Do not stack patches.

## What is deliberately not tested

- The model's wording. Taste is judged by humans; the lab judges facts.
- Exact prompt output. Pinning it makes every prompt improvement a test failure.
- Animation frame by frame. Checked by screenshots per scene and the "every
  frame works as a still" rule.

## Human testing is not optional

- **A native speaker per language** reads five drafts before the demo. A draft
  that reads as stilted to them reads the same way to a judge.
- **A friend with no explanation** completes a fan-out in 60 seconds. If they
  ask a question, that question is the bug.
