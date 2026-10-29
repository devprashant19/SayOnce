# SayOnce: agent guidelines

> Say it once, and everyone who needs to know gets their own version.
>
> Entry for *No Hands: The Wispr Challenge* (WeMakeDevs × Wispr Flow).
> Deadline: **Saturday 31 October 2026, 23:59 IST.**

This file is **committed, but never deployed**. It shapes the build; it does not
ship in it. It has to be in the repo so that whichever agent you run, on
whichever machine, starts from the same rules — but `.vercelignore` keeps it out
of the deployed bundle.

What stays out of git entirely is the genuinely private data: `SPEC.md`, the
golden set, `.env*`, `ROLLBACK.md`. See
[`docs/rules/R4-DATA-AND-SECRETS.md`](docs/rules/R4-DATA-AND-SECRETS.md).

---

## 1. Read these before changing anything

1. [`docs/00-INDEX.md`](docs/00-INDEX.md) — the map
2. [`docs/rules/R0-HARD-RULES.md`](docs/rules/R0-HARD-RULES.md) — the eleven
   non-negotiables
3. [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) — the pipeline and the
   file map
4. The doc for the phase you are on, in [`docs/phases/`](docs/phases/)

Then run `npm run verify:all` and see it pass before touching code.

## 2. Core engineering principles

1. **Simplicity over abstraction.** Write the simplest, cleanest TypeScript that
   works. No speculative helpers, no factory patterns, no abstraction for one
   caller. Two days.
2. **Minimal, surgical diffs.** Touch only the files the active phase needs.
   Preserve working code, existing types, comments and architecture.
3. **Verify before saying done.** Never assert a phase or task is complete.
   Prove it with real terminal output from `npm run verify:all` and
   `npm run lab`. "It should work" is treated as "it does not work".
4. **Deterministic code over AI self-claims.** The AI is a reasoning engine, not
   the final judge. `lib/checker.ts` has final authority over invented facts,
   leaks, script and channel fit. When it fails a draft, the send button is
   disabled, whatever the AI verify layer concluded.

## 3. The eleven hard rules

Summarised; the full text is in
[`docs/rules/R0-HARD-RULES.md`](docs/rules/R0-HARD-RULES.md).

1. Never invent a fact.
2. Privacy-tagged facts never reach a blocked person — enforced by what Compose
   is *handed*, not by instructing the model.
3. The deterministic checker has final authority.
4. Wispr Flow is the input method. No unofficial SDK. Design every text box to
   receive dictation.
5. One fixed model, structured output, one retry, never an empty result.
6. API keys server-side only. No `NEXT_PUBLIC_` anything.
7. No login, anywhere.
8. Mobile-first — usable at 360 px, tested.
9. Keep it simple; change only what the task asks.
10. Never commit `SPEC.md`, the golden set, `.env*` or `ROLLBACK.md` — they hold
    real names, real phone numbers and keys. Never *deploy* those or any agent
    instruction file. Do not push to git unless asked.
11. Verify before saying done.

## 4. Already built — do not reimplement

The base is Phase 1, built and verified: **90 tests pass**.

| Module | Tests | What it guarantees |
| --- | --- | --- |
| `lib/checker.ts` | 22 | Zero invented facts, no leaks, right script, channel fit. **Final authority.** |
| `lib/trail.ts` | 12 | The hash chain and tamper detection |
| `lib/links.ts` | 33 | `wa.me` and `mailto:` round-trip across Devanagari, emoji, line breaks, specials |
| `lib/dates.ts`, `lib/script.ts`, `lib/scrub.ts`, `lib/voice-return.ts` | 23 | Relative dates, script detection, the scrub, the Voice Return arithmetic |
| `lib/types.ts` | — | Every schema in one file |
| `lib/ai/call.ts` | — | The only way to call a model |
| Extract, Compose, the Speak screen, draft cards, provenance hover | — | The working pipeline |

**These three must stay pure** — no network, no model, no clock: `lib/checker.ts`,
`lib/trail.ts`, `lib/links.ts`. They carry the product's promises and are why
the promises are defensible.

If a phase doc describes one of them, that is documentation of what exists, not
a request to build it. **An agent re-implementing a tested module is the most
expensive mistake available on a two-day build, because it looks like progress.**

## 5. Phase map

| Phase | Builds | Doc |
| --- | --- | --- |
| 0 | Spec, golden set, idea review | [`PHASE-00`](docs/phases/PHASE-00-FOUNDATION.md) |
| 1 | Extract → Compose, Speak screen — **built** | [`PHASE-01`](docs/phases/PHASE-01-CORE-PIPELINE.md) |
| 2 | People Book, Route, Knowledge Matrix | [`PHASE-02`](docs/phases/PHASE-02-PEOPLE-BOOK-ROUTING.md) |
| 3 | Send layer | [`PHASE-03`](docs/phases/PHASE-03-SEND-LAYER.md) |
| 4 | Verify, provenance, Privacy Shield, Trust Trail, Quality Lab | [`PHASE-04`](docs/phases/PHASE-04-VERIFY-AND-LAB.md) |
| 5 | Update Log, learning, Consistency Guard, Voice Return | [`PHASE-05`](docs/phases/PHASE-05-LOG-AND-MEMORY.md) |
| 6 | Demo mode, global, command bar, UI pass | [`PHASE-06`](docs/phases/PHASE-06-DEMO-AND-UI.md) |
| 7 | Animated landing page | [`PHASE-07`](docs/phases/PHASE-07-LANDING-PAGE.md) |
| D | Judge demo and deployment | [`PHASE-D`](docs/phases/PHASE-D-JUDGE-DEMO-DEPLOY.md) |
| 8 | Real use, proof, video, submission | [`PHASE-08`](docs/phases/PHASE-08-PROOF-AND-SUBMISSION.md) |

**Every phase gets built.** Scope is cut *inside* a phase, using the cut line
named in its doc — never by skipping a phase. The 48-hour schedule is in
[`docs/19-SCHEDULE-2-DAYS.md`](docs/19-SCHEDULE-2-DAYS.md).

Phase D runs after Phase 7 and before Phase 8, so judges and real use share one
deployed app. **The public link must be live by hour 39.**

## 6. The gate

No phase is done until all six pass. All six, every phase.
[`docs/phases/PHASE-GATE.md`](docs/phases/PHASE-GATE.md).

1. **Works** — private window, phone, no login
2. **Accuracy** — `npm run lab` meets this phase's targets, on the **full** set
3. **UI** — the five checks
4. **Review** — a reviewer that did not build it rates all four judging criteria ≥8
5. **Wispr log** — words noted, one clip saved
6. **Snapshot** — a named local rollback point

## 7. Commands

```bash
npm run dev             # the pipeline lives behind a server route
npm run verify:all      # typecheck, lint, tests, production build
npm run test            # 90 tests on the deterministic core
npm run lab             # the golden set through the live pipeline
npm run lab -- --group tricky-instruction
npm run audit:secrets   # pre-deploy leak audit; run after a build
```

## 8. Skills to apply, by phase

Install them **globally** (`-g`), never into the project, so no `SKILL.md` or
`.claude/` folder lands in the app folder.

| Phase | Skills | Focus |
| --- | --- | --- |
| 0 | `superpowers` (planning), spec-driven development | The interview, SPEC.md, the golden set |
| 1–2 | `mattpocock-typescript` | Strict types, narrow unions, robust validators |
| 2–3 | `ponytail` | Native features first; one small test for any branching logic |
| 4 | `ponytail`, `superpowers` (TDD) | Deliberate algorithmic thinking; the hash chain; quote grounding |
| 5 | `superpowers` (debugging) | Consistency Guard false-positive hunting |
| 6 | `ui-ux-pro-max`, `taste-skill`, `addyosmani-agent-skills` | Design system, WCAG 2.1 AA, keyboard traps |
| 7 | `frontend-design`, `taste-skill` | Scroll story, art direction, then a fresh critic |
| D | `addyosmani-agent-skills` | Serverless limits, bundle check, deploy |
| 8 | `webapp-testing`, `superpowers` (verification) | Playwright paths, zero-leak audit |

Every phase: **`superpowers` verification-before-completion.** Skip
`using-git-worktrees` and branch-finishing workflows — this build uses local
snapshots and a CLI deploy, not branches and merges.

## 9. Working style

- Before building: restate the task, list assumptions, show a short plan with a
  check per step. Wait for an OK.
- Ask when something is ambiguous instead of guessing.
- After building: run the find-and-fix loop until clean or blocked.
- End every task with: **what changed, how you verified it (evidence, not
  claims), what is still open, what you skipped.**

## 10. This is an isolated project

SayOnce shares a parent folder with an unrelated project called Rightful.
**Never read from, write to, or reference anything outside this folder.** They
share nothing — not code, not configuration, not dependencies.
