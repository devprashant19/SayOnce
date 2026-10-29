# Phase D — Judge demo and deployment

**Hours 36–39.** Runs **after Phase 7 and before Phase 8**, so judges and your
real use share one deployed app.

**The hard deadline inside the deadline: the public link must be live and smoke
tested by hour 39.** Everything after this point is evidence-gathering on a
working deployment.

Reference: [../10-JUDGE-DEMO.md](../10-JUDGE-DEMO.md) and
[../11-DEPLOYMENT.md](../11-DEPLOYMENT.md).

---

# Part A — The judge demo

## 1. Routes and entry points

All three land in the same place:

| Entry | Use |
| --- | --- |
| `/demo` | The dedicated link that goes **first** in the submission |
| "Judge demo" button | Landing hero and app header (already in the layout) |
| `?demo=1` on any app URL | So you can link straight to a screen |

`/demo` opens the app in demo mode with the Speak box **pre-filled** with a
sample Hinglish update and a banner:

> Demo mode. Press Fan out, or replace the text with your own.

## 2. Isolated demo sessions

- A session id generated on first visit, **signed with `DEMO_SESSION_SECRET`**,
  so a visitor cannot forge one and read someone else's rows
- Stored in the browser; sent with every demo request
- Every demo row carries that id in `dataset`
- Every demo query filters on it. **There is no query path from demo mode to
  `dataset = 'real'`.**
- Expiry after 24 hours, with cleanup

**Demo mode can never read real contacts or real updates.** This is the control
that makes a public, no-login app safe.

## 3. Dataset picker

Indian team / Global team. Every sample update has **precomputed cached results
for all steps** — facts, routing, drafts, verify, trail — so the guided path
never calls a model.

Built in Phase 6. Confirm here that it is wired to the demo route and that the
cache is current with the latest prompts.

## 4. The guided tour

Five skippable steps, one tooltip each with a Next button:

1. Fan out
2. Knowledge Matrix
3. Hover a sentence (provenance)
4. Open a blocked draft (Privacy Shield)
5. Verify trail

The tour exists because a judge with five minutes and twenty projects to score
will not find the Privacy Shield on their own — and the Privacy Shield is the
moment that wins criterion 1.

## 5. Send buttons in demo mode

They work, pointing at **placeholder** numbers and addresses, with a note
explaining that real contacts are hidden in demo mode.

A demo send must never open a chat with a real number.

## 6. Reset demo

Restores the starting state for that session, so the next judge gets a clean
run.

## 7. Live AI for custom text

| Control | Variable |
| --- | --- |
| Per-session daily cap | `DEMO_SESSION_AI_CAP` |
| Deployment daily cap | `DEMO_DAILY_AI_CAP` |
| Kill switch, no redeploy | `DEMO_LIVE_AI=off` |

Past a cap: a **friendly limit message that offers the cached samples**. Not an
error, not silence.

## 8. Read-only links

To `/proof` and the latest Quality Lab run, from the demo.

---

# Part B — Deployment

## 1. Pre-flight

```bash
npm run verify:all        # typecheck, lint, tests, production build
npm run lab               # the full golden set, every target met
npm run audit:secrets     # no keys, real numbers, addresses or private files
```

**Fix anything failing before the first deploy.** A broken first deploy costs
more time than the pre-flight does.

## 2. Environment variables

List every one with its purpose ([../11-DEPLOYMENT.md](../11-DEPLOYMENT.md) has
the table). Set them in the host's dashboard or secrets CLI, **never in an
uploaded file**.

Then confirm none reached the client:

```bash
grep -rE "AIza[0-9A-Za-z_-]{30,}|postgres://" .next/static/ || echo clean
```

## 3. Database

```bash
npm run db:migrate    # schema, including the append-only trail migration
npm run db:seed       # demo tables ONLY
```

Real-use rows stay in `dataset = 'real'` and are read by `/proof` as anonymised
totals. **Never upload the golden set.**

## 4. The ignore file

`.vercelignore` is written. **Show the file list the CLI will upload and check it
by eye** before the first deploy. None of these may appear: `SPEC.md`,
`data/golden/golden-set.json`, `.env*`, `ROLLBACK.md`, `docs/`, `CLAUDE.md`,
`AGENTS.md`, `.claude/`.

## 5. Preview first

```bash
npx vercel
```

Run the smoke test against the **preview URL**. Fix and redeploy until clean.
**Never promote a preview you have not smoke-tested.**

## 6. Promote

```bash
npx vercel --prod
```

A clean subdomain. A custom domain is optional and not worth time on day two.

## 7. Warm the caches

Request `/`, `/demo`, `/proof` and each cached sample once, so no judge pays for
the cold start.

## 8. ROLLBACK.md

**Local only, never uploaded.** The one command that promotes the previous
deployment, plus the list of deployment ids newest first with a one-line note on
each. Record every production deployment id as you make it — finding it under
pressure is the slow part.

## 9. Monitoring

A free uptime check on `/`, `/demo` and `/proof` every few minutes. Turn on the
host's error logs. `/api/health` reports readiness without leaking any value.

---

## The smoke test

Private window, then your phone. After **every** deploy.

- [ ] Landing loads fast; the scroll story plays
- [ ] Reduced motion shows the complete static version
- [ ] The main button transitions into the app
- [ ] `/demo` opens with sample text; Fan out shows cards **instantly**
- [ ] Knowledge Matrix, provenance hover and a Privacy Shield block all work
- [ ] A WhatsApp button opens the right chat with the full text, Devanagari and
      line breaks intact
- [ ] An email button opens with subject and body
- [ ] Verify trail turns green
- [ ] Reset demo restores the start
- [ ] Typing a custom update runs live AI
- [ ] Past the cap, the limit message appears and samples still work
- [ ] `DEMO_LIVE_AI=off` degrades gracefully rather than erroring
- [ ] `/proof` loads with real numbers and **no** names, phones or emails
- [ ] The Open Graph preview looks right pasted into WhatsApp
- [ ] All of it at 360 px and 1440 px
- [ ] **No login prompt anywhere**

## The load check

Simulate **20 concurrent demo sessions**. Confirm:

- [ ] No session sees another's edits
- [ ] The per-session and daily caps hold
- [ ] Cached samples stay instant under load

Then search the deployed site **and its source maps** for secrets, phone numbers
and email addresses.

---

## Acceptance criteria

- [ ] A judge can open the link and complete a fan-out with **no sign-in and no
      instructions**
- [ ] The guided path makes **zero** AI calls
- [ ] 20 concurrent sessions stay isolated; caps hold
- [ ] Nothing private is in the uploaded file list or the deployed bundle
- [ ] The smoke test passes on production, not just the preview
- [ ] `ROLLBACK.md` exists with at least one deployment id

## Cut line

- The guided tour can be **three** steps instead of five: Fan out, Privacy
  Shield, Verify trail.
- The uptime monitor can be a manual check every few hours.
- The load check can be five concurrent sessions rather than twenty.

**Do not cut:** demo session isolation, the caps, the kill switch, the leak
audit, or the production smoke test. Each of those protects against a failure
that would happen in front of a judge.

## Gate

Full [standard gate](PHASE-GATE.md) — and from here on, "Works" means the
**deployed URL** in a private window and on a phone, not localhost.

Report: the judge demo URL, the production URL, the deployment id, the
environment variable list (**names only**), the smoke test results, the load
test results, and anything still open.
