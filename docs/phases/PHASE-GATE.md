# The phase gate

**No phase is done until all six pass.** Not five. The gate is the same for
every phase, which is what makes "done" mean something across a build this
short.

---

## 1. Works

- [ ] The public link works in a **private browser window**
- [ ] It works on **your phone**
- [ ] **No login** anywhere
- [ ] The main path completes without a console error

Before Phase D there is no public link yet, so this is the local dev server in a
private window plus your phone on the same network. From Phase D onward it is
the deployed URL.

## 2. Accuracy

- [ ] `npm run lab` meets this phase's targets
- [ ] From Phase 1 on, **the full golden set is re-run**, so nothing earlier has
      broken
- [ ] Both hard gates hold: zero invented facts, 100% privacy

Not the failures. Not the group you touched. The whole set. A fix that breaks an
earlier case is not a fix.

## 3. UI

All five checks, every time:

- [ ] One primary action per screen
- [ ] Readable on a phone at **360 px**
- [ ] Every button says what it does
- [ ] Empty, loading and error states shown
- [ ] Nothing needs a keyboard except Wispr's hotkey — and everything is also
      keyboard reachable

Plus, per screen touched this phase:

- [ ] Light and dark
- [ ] Tab through it start to finish; focus always visible; no trap
- [ ] `prefers-reduced-motion` on
- [ ] A Devanagari draft on screen, to check the font

## 4. Review score

- [ ] A reviewer **that did not build this** rates each of the four judging
      criteria at least **8 out of 10**
- [ ] Its top weakness is either fixed or written down with a decision

The review prompt is in [../prompts/REUSABLE-PROMPTS.md](../prompts/REUSABLE-PROMPTS.md).
Run it in a fresh session. It must verify the builder's claims itself — open the
link, run three golden cases by hand — before it scores anything.

## 5. Wispr log

- [ ] The words dictated this phase noted from Insights
- [ ] **One screenshot or clip of Flow in use** saved for the demo

This is the only gate item that is not about the code, and it is the one most
likely to be skipped. Two seconds of footage per phase is what lets the demo
open with "I built this by talking to it" and have it be visibly true.

## 6. Snapshot

- [ ] A named local snapshot you can roll back to

No push needed. "Go back to the state at the Phase 4 gate" is worth more on a
two-day build than any branching strategy.

---

## Running the gate

```bash
npm run verify:all      # typecheck, lint, 90+ tests, production build
npm run lab             # the full golden set
npm run audit:secrets   # after the build, since it scans .next
```

Then the UI checklist by hand, then the review in a fresh session.

## The report a phase ends with

Four things, in this order:

1. **What changed** — files, and what each change does
2. **How you verified it** — real terminal output, the lab table before and
   after, screenshots. Evidence, not claims.
3. **What is still open** — with your assessment of whether it blocks
4. **What you skipped**, and why

A report without section 2 is not a report. "It should work" is treated as "it
does not work".

## When the gate fails

Do not move on. Do not start the next phase "while this settles".

Fix at the right layer ([R5](../rules/R5-TESTING-AND-GATES.md)), add the
regression check, re-run everything.

The one exception: if the clock forces a choice, take the **cut line** named in
that phase's doc rather than passing the gate on a technicality. A phase shipped
smaller with its gate honestly passed is worth more than a phase shipped whole
with the gate waved through — because the gate is the only thing standing
between the build and an entry that breaks in front of a judge.
