# SayOnce

**Say it once, and everyone who needs to know gets their own version.**

*Launched in India as Ek Baar Bolo.*

---

Anyone who coordinates people rewrites the same facts many times a day. One
delayed shipment becomes a formal email to the manager, a short Hinglish
WhatsApp to the vendor, a Hindi message to the warehouse lead, a careful note to
the client that leaves out whose fault it was, and a row in a tracker that never
gets filled in.

The facts are identical. What changes is the language, the tone, the level of
detail, and — the part other tools miss — **which facts each person gets at
all.**

SayOnce takes one spoken update and produces one message per reader.

## How it works

1. **Speak.** Hold your dictation key and talk for 30 to 90 seconds, in whatever
   mix of languages you actually think in.
2. **It works out who needs to know**, with a one-line reason for each person
   that you can check in two seconds.
3. **It writes each person their own message** — only the facts that matter to
   them, in their language and script, at their level of formality, sized for
   their channel.
4. **It checks its own work.** A plain function, with no AI in it, re-reads every
   draft against the facts you actually spoke. Anything it cannot account for is
   held back and shown to you with the offending phrase struck through.
5. **Send in one tap.** WhatsApp opens on the right chat with the text filled in.
   Email opens with the subject and body ready.
6. **The log writes itself** — every update with its facts, its decisions, and
   who was told.

## What makes it trustworthy

**Nothing invented.** Every number, date, name and place in every message must
exist in the facts extracted from your words. This is checked twice: once by a
pure function that has final authority, and once by a separate AI pass that
catches what arithmetic cannot. If the two disagree, the function wins.

**What you withhold stays withheld.** Say "don't tell the vendor about the
delay" and that fact is locked. It never enters the prompt that writes the
vendor's message — so the guarantee does not depend on asking a model to keep a
secret it has been told.

**A tamper-evident record.** Every step of every update is appended to a log
where each entry carries a hash of the one before it. A "Verify trail" button
recomputes the chain; if anything was altered, it turns red at exactly that row.

**A visible accuracy screen.** The Quality Lab runs a recorded set of real
updates through the live pipeline and scores each one against published targets,
with a history of runs. You can see whether it is getting better, rather than
being told.

## Running it locally

Requires Node 20.9 or later.

```bash
cp .env.example .env.local     # paste a free Gemini key: aistudio.google.com/apikey
npm install
npm run smoke:ai               # 5 seconds: is the key and model working?
npm run dev                    # http://localhost:3000
```

The AI pipeline runs server-side only; no key is ever sent to the browser.
`DATABASE_URL` is needed for the People Book and the Update Log, and not for the
core fan-out.

```bash
npm run verify:all      # typecheck, lint, 118 offline tests, production build
npm run test            # the deterministic core — no network, no key, no cost
npm run test:live       # the real pipeline against the real model (needs a key)
npm run lab             # the recorded test set through the live pipeline
npm run audit:secrets   # leak audit over the built output
```

`npm run test` never calls a model, so it is always safe to run. `test:live` and
`lab` do, and they say so.

## How accuracy is checked

A recorded set of spoken updates, each with the recipients who should have been
chosen, the facts each recipient must receive, and anything a recipient must
never receive. Five groups: real updates, Hinglish edge cases (numbers said in
Hindi, relative dates like "parso", English words written in Devanagari), tricky
instructions, non-Indian language mixes, and deliberately adversarial cases.

Two targets are hard gates and not negotiable:

| Metric | Target |
| --- | --- |
| Invented facts | **0** |
| Privacy — a withheld fact reaching a blocked person | **0** |
| Must-know coverage | 95%+ |
| Routing recall / precision | 90%+ / 85%+ |
| Language and script | 100% |
| Channel fit | 95%+ |

`npm run lab` exits non-zero when a target is missed, so it can gate a deploy.

## Built for anywhere

Nothing in SayOnce is specific to one country. Language, script, channel,
formality and honorifics are fields on each contact, not features of the
product — the language field is free text, so "Brazilian Portuguese, informal"
works exactly as well as "Hindi, Devanagari". Phone numbers are stored in
international format, so the WhatsApp links work everywhere.

There are two demo contact sets for this reason: an Indian team and a global
one. One spoken English update produces Spanish, Portuguese and Taglish messages
from the second.

## Deliberately out of scope

- Sending through any messaging API. `wa.me` and `mailto:` links only — official,
  free, and they cannot get a number restricted the way an unofficial library
  can.
- Any login, account or payment.
- Real-time collaboration or multi-user anything.
- Channels beyond WhatsApp, email and copy.

## Stack

Next.js 15 (App Router) · TypeScript · Google Gemini (`@google/genai`) · Zod ·
Postgres with Drizzle · Tailwind CSS v4 · Vitest

One fixed model for the whole build, so accuracy scores stay comparable between
runs. Every step's Zod schema is translated into Gemini's structured-output
schema, which constrains decoding, and then validates the response on the way
back — the schema constrains the shape, Zod enforces the contract.

## Credits

Built for **No Hands: The Wispr Challenge** by WeMakeDevs and Wispr Flow — a
challenge to fix a real problem in your own work, and to build it by voice.
