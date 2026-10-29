# Deployment

Deploy from the local folder with the host's CLI. Nothing needs to go to git,
and the public link does not depend on a repo being public.

**Host: Vercel.** It runs server routes (mandatory — the AI key and the trail
hashing are server-side), deploys from a folder, and rolls back by promoting a
previous deployment in one command. Netlify and Cloudflare Pages both work the
same way if you prefer one of those; the steps below are the same with
different verbs.

## Steps

### 1. Pre-flight, locally

```bash
npm run verify:all        # typecheck, lint, 90 tests, production build
npm run lab               # the full golden set, every target met
npm run audit:secrets     # no keys, real numbers, addresses or private files
```

Fix anything failing **before** the first deploy. A broken first deploy costs
more time than the pre-flight does.

### 2. The environment variable list

Every variable, its purpose, and where it is set. Nothing else should be secret.

| Variable | Purpose | Secret |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | The one AI key | yes |
| `SAYONCE_MODEL` | The fixed model id | no |
| `SAYONCE_EFFORT` | Effort for the four pipeline steps | no |
| `SAYONCE_GRADER_EFFORT` | Fixed grader effort; must not change mid-build | no |
| `DATABASE_URL` | Neon connection string | yes |
| `DEMO_LIVE_AI` | `on` / `off` kill switch for live AI on visitor text | no |
| `DEMO_SESSION_AI_CAP` | Live calls per visitor per day | no |
| `DEMO_DAILY_AI_CAP` | Live calls for the whole deployment per day | no |
| `DEMO_SESSION_SECRET` | HMAC secret signing demo session ids | yes |
| `SAYONCE_BASELINE_MINUTES` | Your measured minutes per update, from Phase 0 | no |

Set them in the host's dashboard or with its secrets CLI — **never in a file
that gets uploaded**. Then confirm none reached the client:

```bash
grep -r "sk-ant-" .next/static/ || echo "clean"
grep -r "postgres://" .next/static/ || echo "clean"
```

`lib/env.ts` imports `server-only`, so a client component that reaches for a
secret is a build error rather than a leak. Keep it that way.

### 3. Database

```bash
npm run db:generate      # from lib/db/schema.ts
npm run db:migrate       # against DATABASE_URL
```

Then add the hand-written append-only migration for `trail_entries` — see
[`drizzle.README.md`](../drizzle.README.md). The hash chain is only a guarantee
if the table cannot be edited by the code that writes it.

```bash
npm run db:seed          # demo tables ONLY
```

Real-use data lives in rows with `dataset = 'real'` and is read by `/proof` as
anonymised totals. **Never upload the golden set.**

### 4. The ignore file

`.vercelignore` is already written. Before the first deploy, look at what the
CLI says it will upload:

```bash
npx vercel deploy --prebuilt=false 2>&1 | head -50
```

Confirm by eye that none of these appear: `SPEC.md`, `data/golden/golden-set.json`,
`.env*`, `ROLLBACK.md`, `docs/`, `CLAUDE.md`, `AGENTS.md`, `.claude/`.

### 5. Preview first

```bash
npx vercel                    # preview deployment
```

Run the smoke test below against the **preview URL**. Fix and redeploy until
clean. Do not promote a preview you have not smoke-tested.

### 6. Promote to production

```bash
npx vercel --prod
```

Use a clean subdomain — `sayonce.vercel.app` or similar. A custom domain is
optional and not worth time on day two.

### 7. Warm it up

Request `/`, `/demo`, `/proof` and each cached sample once, so no judge is the
one who pays for the cold start.

```bash
for path in / /demo /proof /api/health; do curl -s -o /dev/null -w "%{http_code} $path\n" "$PROD_URL$path"; done
```

### 8. Monitor

A free uptime monitor on `/`, `/demo` and `/proof` every few minutes. Turn on
the host's error logs. `/api/health` reports readiness (`ai`, `database`,
`demoLiveAi`) without leaking any value, so it is safe to monitor publicly.

### 9. Know your rollback

Write `ROLLBACK.md` — **local only, never uploaded** — containing:

- the one command that promotes the previous deployment
- the list of deployment ids, newest first, with a one-line note on each

```
npx vercel promote <deployment-url>
```

That takes seconds and needs no rebuild. Record the id of every production
deployment as you make it, because finding it under pressure is the slow part.

### 10. Freeze before submitting

**No deploys in the last day except fixes for real breakage**, each followed by
the full smoke test. A "small improvement" at hour 46 is how a working entry
becomes a broken link.

## Smoke test

After every deploy. Private window, then your phone.

- [ ] Landing page loads fast; the scroll story plays
- [ ] `prefers-reduced-motion` shows the complete static version
- [ ] The main button transitions into the app
- [ ] `/demo` opens with sample text; Fan out shows the cards **instantly**
- [ ] Knowledge Matrix, provenance hover and a Privacy Shield block all work
- [ ] A WhatsApp button opens the right chat with the full text, including
      Devanagari and line breaks
- [ ] An email button opens with subject and body filled in
- [ ] Verify trail turns green
- [ ] Reset demo restores the start
- [ ] Typing a custom update runs live AI
- [ ] Past the cap, the polite limit message appears and samples still work
- [ ] `/proof` loads with real numbers and **no** names, phones or emails
- [ ] The Open Graph preview looks right when the link is pasted into WhatsApp
- [ ] All of the above at 360 px and at 1440 px
- [ ] No login prompt anywhere

Automate what you can with a browser script; keep the rest as a checklist.

## Load check

Before judging, simulate 20 concurrent demo sessions and confirm:

- no session sees another's edits
- the per-session and daily caps hold
- cached samples stay instant under load

## If something breaks during judging

1. Promote the last good deployment (`ROLLBACK.md`).
2. If the AI is the problem rather than the code, set `DEMO_LIVE_AI=off`. The
   cached samples keep the whole guided path working, so the demo survives an
   outage.
3. Re-run the smoke test on production.
4. Do not start debugging on production with judges on the site.
