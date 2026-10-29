# SayOnce implementation docs

Everything needed to build SayOnce from the base in this repo to a submitted
entry. Written to be read by a build agent and by the person directing it.

**Deadline: Saturday 31 October 2026, 23:59 IST.** Two days from the start of
the build. Every phase gets built — the schedule in
[19-SCHEDULE-2-DAYS.md](19-SCHEDULE-2-DAYS.md) says how, by cutting scope
inside phases rather than cutting phases.

## Read these first, in this order

1. [01-PRODUCT-BRIEF.md](01-PRODUCT-BRIEF.md) — what SayOnce is and why it is shaped this way
2. [rules/R0-HARD-RULES.md](rules/R0-HARD-RULES.md) — the eleven rules that override everything else
3. [03-ARCHITECTURE.md](03-ARCHITECTURE.md) — the five-stage pipeline and where each piece lives
4. [phases/PHASE-GATE.md](phases/PHASE-GATE.md) — what "done" means, and it is not a claim

## Reference

| Doc | What it settles |
| --- | --- |
| [01-PRODUCT-BRIEF.md](01-PRODUCT-BRIEF.md) | The problem, the user, the one-line pitch, the screens |
| [02-CHALLENGE-AND-JUDGING.md](02-CHALLENGE-AND-JUDGING.md) | What the judges score, who they are, what loses points |
| [03-ARCHITECTURE.md](03-ARCHITECTURE.md) | Stack decisions and why, pipeline shape, file map |
| [04-DATA-MODEL.md](04-DATA-MODEL.md) | Every table and field, and the demo/real separation |
| [05-AI-PIPELINE.md](05-AI-PIPELINE.md) | Extract, Route, Compose, Verify: schemas and prompt contracts |
| [06-STANDOUT-FEATURES.md](06-STANDOUT-FEATURES.md) | The seven features that make it a product, with acceptance criteria |
| [07-ACCURACY-SYSTEM.md](07-ACCURACY-SYSTEM.md) | The golden set, the targets, how each is checked |
| [08-UI-UX-RULES.md](08-UI-UX-RULES.md) | Design tokens, the five UI checks, accessibility bar |
| [09-WISPR-INTEGRATION.md](09-WISPR-INTEGRATION.md) | How Wispr is used in the product and in the build |
| [10-JUDGE-DEMO.md](10-JUDGE-DEMO.md) | One link, one click, no sign-in — and how it survives traffic |
| [11-DEPLOYMENT.md](11-DEPLOYMENT.md) | CLI deploy from a local folder, env vars, smoke test, rollback |
| [12-SECURITY-AND-PRIVACY.md](12-SECURITY-AND-PRIVACY.md) | What never leaves this machine, and what is enforced where |
| [13-TESTING-STRATEGY.md](13-TESTING-STRATEGY.md) | Unit, round-trip, lab, device and pre-submission audits |
| [14-LANDING-PAGE.md](14-LANDING-PAGE.md) | The six-scene scroll story and its motion rules |
| [15-DEMO-SCRIPT-AND-SUBMISSION.md](15-DEMO-SCRIPT-AND-SUBMISSION.md) | The two-minute video, shot by shot, and the write-up |
| [16-RISKS-AND-FALLBACKS.md](16-RISKS-AND-FALLBACKS.md) | What goes wrong and what to do instead |
| [17-PRIOR-ART.md](17-PRIOR-ART.md) | Five proven patterns worth copying, and one to avoid |
| [18-GLOBAL-READINESS.md](18-GLOBAL-READINESS.md) | Why nothing is hard-coded for one country |
| [19-SCHEDULE-2-DAYS.md](19-SCHEDULE-2-DAYS.md) | The 48-hour plan, hour by hour, with cut lines |

## Rules

Short, enforceable, and quoted at the agent in every session.

| Doc | Scope |
| --- | --- |
| [rules/R0-HARD-RULES.md](rules/R0-HARD-RULES.md) | The non-negotiables |
| [rules/R1-TYPESCRIPT.md](rules/R1-TYPESCRIPT.md) | Types, schemas, narrow unions, no `any` |
| [rules/R2-AI-CALLS.md](rules/R2-AI-CALLS.md) | One model, structured output, retry once, never invent |
| [rules/R3-UI-A11Y.md](rules/R3-UI-A11Y.md) | One primary action, 360 px, focus, contrast, reduced motion |
| [rules/R4-DATA-AND-SECRETS.md](rules/R4-DATA-AND-SECRETS.md) | What is private, where secrets live, demo isolation |
| [rules/R5-TESTING-AND-GATES.md](rules/R5-TESTING-AND-GATES.md) | Prove it with output, re-run everything, no self-grading |
| [rules/R6-GIT-AND-DEPLOY.md](rules/R6-GIT-AND-DEPLOY.md) | What is committed, what is uploaded, how to roll back |
| [rules/R7-VOICE-WORKFLOW.md](rules/R7-VOICE-WORKFLOW.md) | Dictate everything; the loop between planner, builder and reviewer |
| [rules/R8-GIT-DISCIPLINE.md](rules/R8-GIT-DISCIPLINE.md) | Commit after every fix, Conventional Commits, branch per phase, tag each gate |

## Phases

Nine build phases plus deployment. Each ends with the same gate.

| Phase | Builds | Doc |
| --- | --- | --- |
| 0 | Spec, golden set, idea review | [phases/PHASE-00-FOUNDATION.md](phases/PHASE-00-FOUNDATION.md) |
| 1 | Extract → Compose, the Speak screen | [phases/PHASE-01-CORE-PIPELINE.md](phases/PHASE-01-CORE-PIPELINE.md) |
| 2 | People Book, Route, Knowledge Matrix | [phases/PHASE-02-PEOPLE-BOOK-ROUTING.md](phases/PHASE-02-PEOPLE-BOOK-ROUTING.md) |
| 3 | Send layer | [phases/PHASE-03-SEND-LAYER.md](phases/PHASE-03-SEND-LAYER.md) |
| 4 | Verify, provenance, Privacy Shield, Trust Trail, Quality Lab | [phases/PHASE-04-VERIFY-AND-LAB.md](phases/PHASE-04-VERIFY-AND-LAB.md) |
| 5 | Update Log, learning, Consistency Guard, commitments, Voice Return | [phases/PHASE-05-LOG-AND-MEMORY.md](phases/PHASE-05-LOG-AND-MEMORY.md) |
| 6 | Demo mode, global readiness, command bar, UI pass | [phases/PHASE-06-DEMO-AND-UI.md](phases/PHASE-06-DEMO-AND-UI.md) |
| 7 | Animated landing page | [phases/PHASE-07-LANDING-PAGE.md](phases/PHASE-07-LANDING-PAGE.md) |
| D | Judge demo and deployment | [phases/PHASE-D-JUDGE-DEMO-DEPLOY.md](phases/PHASE-D-JUDGE-DEMO-DEPLOY.md) |
| 8 | Real use, proof, demo video, submission | [phases/PHASE-08-PROOF-AND-SUBMISSION.md](phases/PHASE-08-PROOF-AND-SUBMISSION.md) |
| 9 | Repo cleanup, after submission — **asks before removing anything** | [phases/PHASE-09-REPO-CLEANUP.md](phases/PHASE-09-REPO-CLEANUP.md) |

Phase D runs after Phase 7 and before Phase 8, so the judges and the real use
share one deployed app.

## Prompts

One per phase, written to be dictated rather than pasted.

- [prompts/00-CONTEXT-BLOCK.md](prompts/00-CONTEXT-BLOCK.md) — prepend to every session
- [prompts/PHASE-PROMPTS.md](prompts/PHASE-PROMPTS.md) — the ten build prompts
- [prompts/REUSABLE-PROMPTS.md](prompts/REUSABLE-PROMPTS.md) — gate review, find-and-fix, idea review

## What already exists

The base in this repo is Phase 1, built and verified:

- Extract → Compose running against one fixed model, structured output, schema-validated
- The deterministic checker (`lib/checker.ts`) with 22 tests, which has final
  authority over every draft
- The Trust Trail hash chain (`lib/trail.ts`) with 12 tests, including tamper detection
- Send-link builders (`lib/links.ts`) with 33 round-trip tests across Devanagari,
  emoji, line breaks and special characters
- Relative date resolution, script detection, output scrub, Voice Return meter
- The Speak screen, draft cards with verified/held-back states, fact provenance
  hover, and the two demo contact sets
- A leak audit (`npm run audit:secrets`) and a Quality Lab runner (`npm run lab`)

Run `npm run verify:all` to see it pass before changing anything.
