# R6 — Deployment

Full detail in [../11-DEPLOYMENT.md](../11-DEPLOYMENT.md).

## Git is R8

Commits, branches, tags and the standing authorization to push are all in
[R8 — Git discipline](R8-GIT-DISCIPLINE.md). The short version: commit after
every fix that passes `npm run check`, push as you go, tag each phase gate.

One thing worth repeating here, because it surprises people: **the public link
does not come from the repo.** It comes from a CLI deploy of the local folder.
Pushing and deploying are independent — a push does not ship anything, and a
deploy does not need a push.

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
