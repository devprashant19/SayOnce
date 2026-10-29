# The context block

Put this in the agent's project instructions once, or send it at the start of
every session. Keep it updated as `SPEC.md` changes.

Text in `[square brackets]` is yours to fill in.

---

```
PROJECT: SayOnce (India launch name: Ek Baar Bolo). Entry for "No Hands: The
Wispr Challenge" by WeMakeDevs and Wispr Flow. Deadline: Saturday 31 October
2026, 23:59 IST.

WHAT IT DOES: I speak one work update, often Hinglish, dictated with Wispr Flow
into a text box. SayOnce extracts the facts, decides who needs to know, writes a
separate message for each person in their own language, tone and channel,
fact-checks every draft against what I actually said, lets me send each in one
tap (WhatsApp via wa.me links, email via mailto links), and logs everything.

WHO IT IS FOR: me first — [my role], who updates [N] people across [languages]
every day. Then anyone who coordinates people across languages and channels,
anywhere in the world.

PIPELINE: Extract -> Route -> Compose -> Verify -> Send and Log.
Plus: Trust Trail (hash-chained audit log), fact provenance, Privacy Shield,
Knowledge Matrix, Consistency Guard, Voice Return meter, Quality Lab.

HOW JUDGES SCORE — design every decision for these:
 1) solves a real problem in my own work
 2) Wispr Flow used meaningfully
 3) it works from a public link with no login
 4) a two-minute demo anyone can follow

THE REPO: the base is built and verified. Read docs/00-INDEX.md first, then
docs/rules/R0-HARD-RULES.md, then the doc for the phase we are on. Run
`npm run verify:all` before changing anything; 90 tests pass today.

Already built and tested, do not reimplement:
 - lib/checker.ts — the deterministic verifier, 22 tests, FINAL AUTHORITY
 - lib/trail.ts — hash chain and tamper detection, 12 tests
 - lib/links.ts — wa.me / mailto builders, 33 round-trip tests
 - lib/dates.ts, lib/script.ts, lib/scrub.ts, lib/voice-return.ts
 - lib/types.ts — every schema
 - lib/ai/call.ts — the only way to call a model
 - lib/ai/schema.ts — Zod to Gemini JSON Schema; never hand-write a schema
 - Extract and Compose, the Speak screen, draft cards, fact provenance hover

HARD RULES:
 - Never invent a fact. Every number, date, name and place in any output must
   exist in the extracted facts from my words.
 - Privacy-tagged facts never reach a blocked person. Enforce it by what Compose
   is handed, not by instructing the model.
 - lib/checker.ts has final authority. When it fails a draft, the send button is
   disabled, whatever the AI verify layer said.
 - Wispr Flow is the input method: it types into any text box. Do NOT integrate
   any unofficial Wispr SDK or API. Design text boxes to receive dictation:
   autofocus, large, accept pasted text, never fight the cursor.
 - One fixed AI model (Gemini) for every AI step. Output constrained by a
   schema and validated against the same Zod schema on the way back. On an
   invalid response, retry once, then show a clear error. Never return an empty
   result as success. The grader runs at temperature 0 and must stay there.
 - API keys server-side only. Never in client code, never in the repo, never
   NEXT_PUBLIC_.
 - No login anywhere. A demo mode with sample data must always work.
 - Mobile-first: usable at 360 px.
 - Keep it simple. Prefer native browser features and existing components over
   new code. Change only what the task asks; do not refactor unrelated code.
 - Never commit SPEC.md, the golden set, .env files or ROLLBACK.md: they hold
   real names, real phone numbers and keys. Never DEPLOY those or any agent
   instruction file (SKILL.md, AGENTS.md, CLAUDE.md, .claude/) — .vercelignore
   handles that.
 - Commit after every fix that passes `npm run check`, and push. One logical
   change per commit, Conventional Commits, name the golden case a fix fixes.
   Branch per phase, tag each gate. Full conventions in
   docs/rules/R8-GIT-DISCIPLINE.md. Ask before force-pushing, resetting hard,
   or removing files from the repo.

GOLDEN SET: data/golden/golden-set.json — my real cases, never committed.
data/golden/golden-set.example.json — eight seed cases, committed.
Every phase must keep all previous cases passing. Run it with `npm run lab`.

WORKING STYLE:
 - Before building: restate the task, list your assumptions, show a short plan
   with a check for each step. Wait for my OK.
 - Ask when something is ambiguous instead of guessing.
 - After building, run the find-and-fix loop: test against the acceptance
   criteria and the golden set, list every issue found, fix it, re-test, and
   repeat until clean or you hit something you need me for.
 - End every task with a report: what changed, how you verified it — evidence,
   not claims — what is still open, and what you skipped.
 - Never say a phase is done. Prove it with real terminal output.
```

---

## Keeping it current

Two things go stale fastest and are worth re-stating each session:

1. **Which phase we are on**, and what the last gate reported.
2. **What is already built**, so the agent does not rebuild `lib/checker.ts` from
   the description in a phase doc.

The "already built" list above is the single most valuable line in the block. On
a two-day build, an agent re-implementing a tested module is the most expensive
mistake available, because it looks like progress.
