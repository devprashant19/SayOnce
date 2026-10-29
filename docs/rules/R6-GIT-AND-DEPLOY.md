# R6 — Git and deployment

Full detail in [../11-DEPLOYMENT.md](../11-DEPLOYMENT.md).

## Git

**Do not push unless asked.** The public link comes from a CLI deploy of the
local folder, not from a repo — so nothing has to be pushed to ship.

- Commit locally, often, so there is always something to go back to.
- Never commit the private files in [R4](R4-DATA-AND-SECRETS.md).
- Branch rather than committing to the default branch.
- A commit message says what changed and why in one line. If a commit fixes a
  golden case, name the case.

## Snapshots instead of branches

Each phase gate ends with a named snapshot you can roll back to, kept locally.
No push needed. On a two-day build, "go back to the state at the Phase 4 gate"
is worth more than any branching strategy.

## Deploy

Vercel CLI, from the folder. Server routes are mandatory — the AI key and the
trail hashing are server-side.

```bash
npm run verify:all && npm run lab && npm run audit:secrets   # pre-flight
npx vercel                                                   # preview
# smoke test the PREVIEW url
npx vercel --prod                                            # promote
# warm /, /demo, /proof and each cached sample
# record the deployment id in ROLLBACK.md
```

**Never promote a preview you have not smoke-tested.**

## Before the first deploy

Look at the file list the CLI says it will upload and confirm by eye that none
of these appear: `SPEC.md`, `data/golden/golden-set.json`, `.env*`,
`ROLLBACK.md`, `docs/`, `CLAUDE.md`, `AGENTS.md`, `.claude/`.

## Environment variables

Set in the host's dashboard or secrets CLI. Never in an uploaded file. The full
list with purposes is in [../11-DEPLOYMENT.md](../11-DEPLOYMENT.md).

After every deploy, confirm nothing reached the client:

```bash
grep -rE "AIza[0-9A-Za-z_-]{30,}|postgres://" .next/static/ || echo clean
```

## Rollback

`ROLLBACK.md` — **local only, never uploaded** — holds the one command that
promotes the previous deployment, and the list of deployment ids newest first
with a one-line note on each.

```
npx vercel promote <deployment-url>
```

Seconds, no rebuild. Record every production deployment id as you make it;
finding it under pressure is the slow part.

## The freeze

**No deploys in the last day except fixes for real breakage**, each followed by
the full smoke test.

A "small improvement" at hour 46 is how a working entry becomes a broken link.

## If something breaks during judging

1. Promote the last good deployment.
2. If the model is the problem rather than the code, set `DEMO_LIVE_AI=off` —
   the cached samples keep the whole guided path working.
3. Re-run the smoke test on production.
4. **Do not debug on production with judges on the site.**
