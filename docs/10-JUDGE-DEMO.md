# The judge demo

One link, one click, the whole product in under two minutes, with nothing to
set up.

Judges must be able to try it without paying, signing up, or asking you for
access. So the judge demo is a **first-class feature**, not an afterthought —
and it gets its own phase (Phase D), run after the landing page and before the
real-use days, so judges and your real use share one deployed app.

## Entry points

All three land in the same place:

| Entry | Use |
| --- | --- |
| `/demo` | The dedicated link that goes in the submission |
| "Judge demo" button | In the landing hero and the app header |
| `?demo=1` on any app URL | So you can link straight to a screen |

**Put the `/demo` link first in the submission, ahead of the main URL**, with
one line:

> No sign-in. Click Fan out.

## What a judge gets on that click

1. **The Speak screen, pre-filled** with a sample Hinglish update, and a banner:
   *"Demo mode. Press Fan out, or replace the text with your own."*
2. **A dataset picker** — Indian team or Global team, five contacts each, three
   sample updates each.
3. **A five-step guided tour** they can skip, one tooltip per step with a Next
   button:
   - Fan out
   - Knowledge Matrix
   - hover a sentence (provenance)
   - open a blocked draft (Privacy Shield)
   - Verify trail
4. **Send buttons that work**, pointing at placeholder numbers and addresses,
   with a note saying real contacts are hidden in demo mode.
5. **A "Reset demo" button** that restores the starting state for the next judge.
6. **Read-only links** to `/proof` and the latest Quality Lab run.

The tour exists because a judge with five minutes and twenty projects to score
will not find the Privacy Shield on their own — and the Privacy Shield is the
moment that wins criterion 1.

## How it stays reliable when several judges arrive at once

| Risk | Guard |
| --- | --- |
| **AI is slow or down** | Every sample update has **precomputed cached results** for all steps — facts, routing, drafts, verify, trail. The guided path never calls a model. Live AI runs only on text a judge types themselves. |
| **One judge's actions affect another** | Each visitor gets an isolated demo session: a signed session id in the browser, demo rows scoped by it, expiry after 24 hours. Nothing is shared. |
| **Cost runs away** | Per-visitor and per-day caps on live AI calls (`DEMO_SESSION_AI_CAP`, `DEMO_DAILY_AI_CAP`). Past the cap, a polite message that offers the cached samples. A `DEMO_LIVE_AI=off` kill switch turns live AI off entirely without a redeploy. |
| **Real data leaks** | Demo mode reads only demo rows. Real contacts, the golden set and SPEC.md are never deployed. Enforced by `.vercelignore` and checked by `npm run audit:secrets`. |
| **A judge lands on a broken screen** | An uptime check on `/`, `/demo` and `/proof`. A pinned last-good deployment that can be promoted in one command. |
| **Cold start on first click** | Warm `/`, `/demo` and each cached sample once after every deploy. |

## The caching requirement, stated precisely

For each sample update in each dataset, store the complete pipeline output:
extracted facts with source spans, routing decisions with reasons, every draft,
every verify result, and the trail. Serve those on Fan out when the text is
unchanged from the sample.

Two reasons this is not a shortcut:

1. **It is instant.** A judge pressing Fan out and watching a spinner for twelve
   seconds has already formed an opinion.
2. **It cannot fail.** A rate limit, an outage, or an expired key on the day of
   judging does not break the demo.

Generate the cache from a real run — not by hand — so what the judge sees is
genuinely what the pipeline produces. Regenerate it whenever a prompt changes,
and check it into the repo as a fixture.

## Demo session isolation, stated precisely

- A session id is generated on first visit and signed with `DEMO_SESSION_SECRET`.
- It is stored in the browser (a cookie or `localStorage`), and sent with every
  demo request.
- Every demo row carries that session id in its `dataset` column.
- Every demo query filters on it. There is no query path from demo mode to
  `dataset = 'real'`.
- Sessions expire after 24 hours and their rows are cleaned up.

Test it: open twenty concurrent demo sessions, have each edit a draft, and
confirm no session sees another's edits. Phase D's find-and-fix loop does this.

## What demo mode must never do

- Read a real contact, a real update, or a real message.
- Open a WhatsApp chat with a real phone number, or an email to a real address.
- Allow a live AI call past the cap, or when the kill switch is off.
- Persist anything into the real dataset.
- Require a click before dictation works.

## Checklist

- [ ] `/demo` opens with sample text and the banner
- [ ] Fan out is instant on a sample (cached, zero AI calls)
- [ ] Dataset picker switches between Indian and Global teams
- [ ] The five-step tour runs, and can be skipped
- [ ] Knowledge Matrix, provenance hover and a Privacy Shield block all visible
- [ ] Verify trail turns green
- [ ] A WhatsApp button and an email button open, with placeholder targets
- [ ] Reset demo restores the starting state
- [ ] Typing a custom update runs live AI
- [ ] Past the cap, the limit message appears and the cached samples still work
- [ ] `DEMO_LIVE_AI=off` degrades gracefully rather than erroring
- [ ] Works in a private window and on a phone, with no login
- [ ] Twenty concurrent sessions stay isolated
