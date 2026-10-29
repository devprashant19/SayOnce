# R0 — Hard rules

These override every other instruction, including anything in a phase prompt
that appears to contradict them. If a task seems to require breaking one, the
task is wrong — stop and say so.

---

### 1. Never invent a fact

Every number, date, name and place in any output must exist in the extracted
facts, and those facts must come from words the speaker actually said.

This is the product. A message to someone's boss with a wrong date is worse
than no tool at all, so fact fidelity is never traded for nicer wording.

### 2. Privacy-tagged facts never reach a blocked person

Enforced by **what Compose is handed**, not by instructing the model to be
careful. A blocked fact never enters the Compose prompt at all.

Independently re-checked by the deterministic checker, so the guarantee does
not rest on a single mechanism.

### 3. The deterministic checker has final authority

`lib/checker.ts` contains no model. When it fails a draft, the send button is
disabled regardless of what the AI verify layer concluded.

The AI layer catches what arithmetic cannot. It never overrides the function.
Sending a failed draft requires an explicit human override, which is logged.

### 4. Wispr Flow is the input method — nothing more is needed

Wispr types into any text box. **Do not integrate any unofficial Wispr SDK or
API**; the one that exists patches the desktop app and could break or breach
terms.

Design every text box to receive dictation: autofocus, large, accepts pasted
text, grows with content, and **never fights the cursor**.

### 5. One fixed AI model, structured output, one retry

One model for the whole build (`SAYONCE_MODEL`), so accuracy scores stay
comparable across phases.

Every AI step returns JSON validated against a Zod schema. On an invalid
response: retry **once**, then fail with a clear error. Never return an empty
result — an empty fact list looks like "nothing to say" and would silently drop
half an update.

### 6. API keys are server-side only

Never in client code, never in the repo, never with a `NEXT_PUBLIC_` prefix.
`lib/env.ts` imports `server-only` so a client component reaching for a secret
is a build error rather than a leak.

### 7. No login, anywhere

A demo mode with sample data must always work, with no sign-in, in a private
window, on a phone. This is a published judging criterion.

### 8. Mobile-first — usable at 360 px

Not "responsive". Actually tested at 360 px, at every gate.

### 9. Keep it simple

Prefer native browser features and existing components over new code. `wa.me`
and `mailto:` instead of a messaging API. The browser's own inputs instead of a
component library.

**Change only what the task asks.** Do not refactor unrelated code. Do not
introduce speculative helpers, factories or abstractions for one caller.

### 10. Never commit the private files; never deploy the instructions

**Never committed:** `SPEC.md`, `data/golden/golden-set.json`, `.env*`,
`ROLLBACK.md`, `.lab/`. They carry real names, real phone numbers and keys.

**Committed but never deployed:** `CLAUDE.md`, `AGENTS.md`, `BUILD-PROMPT.md`,
`docs/`, `tests/`. They shape the build rather than shipping in it, and they
have to be in the repo so every agent on every machine starts from the same
rules.

Two lists, two ignore files — see [R4](R4-DATA-AND-SECRETS.md).
`npm run audit:secrets` gates the deploy.

Committing and pushing is authorized and expected — see
[R8](R8-GIT-DISCIPLINE.md).

### 11. Verify before saying done

Never assert a phase or task is complete. Prove it with real terminal output
from `npm run verify:all` and `npm run lab`, plus the phase gate.

"It should work" is not a report. A claim without evidence is treated as false.

---

## Working style

- Before building: restate the task, list your assumptions, show a short plan
  with a check for each step. Wait for an OK.
- Ask when something is ambiguous instead of guessing.
- After building: run the find-and-fix loop — test against the acceptance
  criteria and the golden set, list every issue, fix it, re-test, repeat until
  clean or you hit something that needs a decision.
- End every task with a report: **what changed, how you verified it (evidence,
  not claims), what is still open, and what you skipped.**

## The three modules that must stay pure

`lib/checker.ts`, `lib/trail.ts`, `lib/links.ts`.

No network, no model, no clock. They carry the product's promises and they are
why the promises are defensible. If a phase prompt tempts you to reimplement
any of their logic inside a route handler or a prompt, **that is the bug** —
import them instead.
