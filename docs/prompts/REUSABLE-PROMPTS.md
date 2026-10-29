# Reusable prompts

Three prompts used at every phase, not once.

---

## Gate review

**Run in a fresh session that has not seen the build.** The reviewer must never
be the agent that built the thing — an agent asked to check its own work grades
the intention, not the result.

```
You are a harsh judge for the No Hands Wispr Challenge and a senior QA
reviewer. You have not seen how this was built.

Inputs: SPEC.md, the phase prompt just completed, the agent's report, the live
link [URL], and the latest Quality Lab results.

1. VERIFY THE REPORT'S CLAIMS YOURSELF. Open the link. Try the demo. Run three
   golden cases by hand. Mark each claim in the report verified, contradicted or
   unverifiable. Do not take the report at face value.

2. RUN THE PHASE GATE:
   - Works: private browser window, phone, no login
   - Accuracy: this phase's targets, on the FULL golden set
   - UI: one primary action per screen, 360 px, every button says what it does,
     empty and loading and error states, nothing needs a keyboard except Wispr's
     hotkey
   - Wispr use visible

3. SCORE OUT OF 10 WITH EVIDENCE on each of the four criteria: a real problem in
   the builder's own work, meaningful use of Wispr Flow, does it work, clarity of
   the demo.

4. LIST ISSUES BY SEVERITY — blocker, major, minor — each with: what happens,
   why it matters to a judge, and a concrete fix.

5. NAME THE SINGLE CHANGE that would most raise the total. Then say whether
   anything in the official example ideas, or any other entry you know of, makes
   this look ordinary.

Be specific. No praise without evidence. The bar is the sample winner that was
tested on notes from 14 real calls.
```

---

## Find and fix

Send to the **build** agent with the reviewer's issue list.

```
Here are issues from an independent review of Phase [N]: [paste or dictate the
list].

For each issue, in severity order:

1. REPRODUCE IT FIRST and show the evidence. If you cannot reproduce it, say so
   and ask me. Do not guess.
2. FIND THE ROOT CAUSE and name the layer: prompt, schema, checker, routing,
   date logic, data, UI, send links, or infrastructure.
3. FIX IT AT THAT LAYER with the smallest change that solves it. Do not refactor
   unrelated code.
4. ADD A REGRESSION CHECK that fails without the fix — a Quality Lab case, a
   unit test, or a scripted check.

Then re-run the FULL Quality Lab and every earlier phase's acceptance checks, not
just the fixed items. If a fix breaks something else, revert and rethink rather
than stacking patches.

Report a table: issue, root cause, fix, regression check added, before and after
evidence. List anything still open and what you need from me.
```

---

## Idea review

Used in Phase 0 against SPEC.md, and worth re-running once midway as a sanity
check.

```
You are a judge for the No Hands Wispr Challenge. Score this project out of 10
on each criterion:

 1. a real problem in the builder's own work
 2. meaningful use of Wispr Flow
 3. does it work
 4. clarity of the demo

Then name the single change that would most raise the total, and say whether any
other entry or official example idea you know of makes this look ordinary.

Be harsh: the bar is the sample winner that was tested on notes from 14 real
calls. If criterion 1 scores below 8, say exactly what about the problem story
is unconvincing.
```

---

## Why the separation matters

It is tempting on a two-day build to let the building agent review its own
phase, because it already has the context. That saves ten minutes and costs the
entry, for a specific reason:

An agent that has just built something has a model of what it *intended*. When
it reads its own output it fills gaps with that intention. The failures that
survive to judging are precisely the ones that look correct to someone holding
the intention in mind — a `sourceSpan` off by ten characters, a reason string
that says "affected by the update", a card whose send button is enabled when it
should not be.

A reviewer with no intention to fill the gaps with has to actually look.

## Using them during the compressed schedule

The full gate review takes 10–15 minutes per phase. Across nine phases that is
over two hours of a 48-hour budget, which is real.

If the clock forces a cut, run the **full** review at these three points and a
short version elsewhere:

| After | Why |
| --- | --- |
| **Phase 0** | If criterion 1 is weak, everything after it is wasted |
| **Phase 4** | The accuracy argument is the entry; this is where it is either real or not |
| **Phase D** | The last point at which a broken deployment can still be fixed calmly |

The short version is step 1 and step 2 only: verify the claims, run the gate.
Never skip step 1.
