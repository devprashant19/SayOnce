# R7 — The voice workflow

Judges score whether Flow is part of the build and the workflow. The workflow
below is how that happens as a by-product of working, rather than as a chore.

See also [../09-WISPR-INTEGRATION.md](../09-WISPR-INTEGRATION.md).

## Dictate everything

Prompts, corrections, every golden test update, `SPEC.md`, every feedback
note, the #NoHandsChallenge posts, the README, the submission write-up.

**Keyboard is allowed for shortcuts and small fixes.** The rule is voice for
prompts, docs and messages — not voice for every keystroke. Dictating a
one-character typo fix is theatre; judges are looking at the volume of *writing*
that went through Flow.

## Dictate the prompt, do not paste it

Before sending a phase prompt, read it aloud through Wispr rather than pasting
it, adding your real names and projects as you go.

Two reasons: the prompt becomes yours rather than a template, and the words
count toward the usage card. The phase prompts in
[../prompts/PHASE-PROMPTS.md](../prompts/PHASE-PROMPTS.md) are written to be read
aloud — short sentences, square brackets where you fill something in.

## Three roles, kept separate

| Role | Job | Give it |
| --- | --- | --- |
| **Planner** | Turns your spoken intent into one precise task with acceptance tests | `SPEC.md`, the phase doc |
| **Builder** | Builds that task | The task only |
| **Reviewer** | Scores the result against the judging criteria and the golden set, and names the weakest point | The judging criteria, the golden set, the live link, the lab results |

**The reviewer must never be the agent that built the thing.** An agent grading
its own work grades the intention.

## The loop for every build step

1. Dictate what you want, as messily as you like.
2. The planner returns one task: goal, exact behaviour, acceptance tests, what
   not to change.
3. The builder writes a plan **before** building. Read it and correct it by voice.
4. It builds. You test the result yourself, by voice.
5. Anything wrong goes back as a **specific failure** — "case 7 sent the delay
   to the vendor" — never a vague complaint.

Step 5 is where most of the quality comes from. "It feels off" produces a
rewrite; "the vendor draft contains the margin figure, which case g_tricky_01
blocks" produces a fix.

## SPEC.md is living

You dictate it in Phase 0 and update it by voice after every phase. It holds the
problem in your words, your real contacts (anonymised), the pipeline stages, the
data fields, the accuracy targets and a changelog.

It is also the context that carries across agents when one hits a usage limit —
which on a two-day build is a question of when, not if.

## Record as you go

- Keep the Wispr Flow Bar visible in **every** recording (Settings → System;
  hidden by default on new installs).
- Save one clip per phase of you dictating to an agent.
- Cut the best two seconds of each into the demo's opening. That is how you show
  the whole build was spoken in a video that only has two minutes.

## The usage card

Screenshot from **Insights** in the desktop app, taken at the end — after the
write-up is dictated, so those words count.

There is a separate ₹1,00,000 attached to usage: ₹50,000 for rank 1 and ₹50,000
drawn at random from everyone on the board. Uploading the card each week is what
puts you on it.
