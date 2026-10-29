# SPEC.md — SayOnce

**Status: draft.** Everything below is my own answer to Phase 0. The figures
marked **TO MEASURE** are the ones I have not timed yet, and they stay blank
rather than estimated until I have. When they are filled in, this file becomes
`SPEC.md`, which is gitignored because it will then carry my real contacts.

---

## 1. The problem, in my words

I take on client web projects as a freelance full-stack developer, usually one
or two at a time, sometimes direct and sometimes subcontracted through an
agency. On any project I am the only person who knows everything, and four or
five other people each need a different slice of it.

A normal working day produces three or four moments where something changes — a
bug found, an endpoint renamed, a scope change, a build ready to test — and
each one means telling several people separately, in different languages,
leaving out different things.

The client gets formal English and must never hear which subcontractor caused a
delay. The designer gets three lines of Hinglish on WhatsApp. The backend
contractor prefers Hindi and wants the exact payload shape. The tester wants
the build number and what is knowingly broken. The agency PM wants the
milestone date and the invoice timing.

So I write the same facts four times, and the one I skip is always the one that
mattered. The project tracker I promised to keep never gets filled in, because
by the time I have sent four messages I have moved on to the next thing.

That is the problem SayOnce solves for me: I say it once, each person gets
their own version, and the log writes itself.

### The measurable before-state

| | Value |
| --- | --- |
| Minutes per update | **TO MEASURE** — time five old-style updates |
| Rewrites per update | 4 |
| People per update | 3–5 |
| Languages | English, Hinglish, Hindi (Devanagari) |
| Channels | WhatsApp, email |
| How often the tracker gets filled in | almost never |

`SAYONCE_BASELINE_MINUTES` stays **unset** until I have timed it. The Voice
Return meter shows nothing rather than a guess while it is empty — see
`lib/voice-return.ts`. This is the one measurement I cannot take later: once I
am using SayOnce I can no longer time the old way of working.

## 2. Users

**Me first.** A freelance full-stack developer running client projects with a
small rotating cast of collaborators, across three languages and two channels.

**Then** anyone who coordinates people across languages and channels — five to
ten regular contacts, at least two languages or channels. Operations, project
coordination, agency account management, sales, founders.

## 3. My contacts

Five, in `data/demo/contacts-freelance.json`. Names and numbers are
placeholders here; the real ones go into the People Book by voice in Phase 2
and never into this repo.

| Label | Role | Language and script | Channel | Formality | Cares about | Never tell |
| --- | --- | --- | --- | --- | --- | --- |
| `f_client` | Client product lead | English | email | formal | Dates she can commit, scope changes, launch impact | Which subcontractor caused a delay; what I pay people; that I am on other projects |
| `f_designer` | UI designer | Hinglish, Roman | whatsapp | casual | Which screens changed, what to redraw, by when. Three lines max | Client budget; the contractor's rate |
| `f_backend` | Backend contractor | Hindi, Devanagari | whatsapp | neutral | Endpoint changes, payload shape, deploy windows, blockers | Client budget; design opinions that are not decisions |
| `f_qa` | QA tester | English | whatsapp | neutral | What is ready to test, what is knowingly broken, the build number | Client budget |
| `f_agency` | Agency project manager | English | email | formal | Milestone dates, invoice timing, risks to escalate | That I talk to the client directly; my rate elsewhere |

The `never tell` column is the part that matters most to me. It is what the
Privacy Shield enforces, and four of the twenty golden cases exercise it.

## 4. Three updates from last week

Written up as `p_real_01`, `p_real_06` and `p_real_07` in
`data/golden/golden-set.draft.json`. Each is one spoken update that has to
become three or four different messages.

The clearest is `p_real_06`: a staging database migration becomes an
**instruction** to the contractor ("migrate tonight, 20 minutes of downtime
from 11pm"), a **constraint** for the tester ("don't use staging until
tomorrow morning"), and a **reassurance** for the client ("staging available by
tomorrow afternoon").

Same event, three different contents — not three translations of one message.
That property is the whole product, and it is what every case I add should
preserve. An update where everyone gets the same sentence in a different
language would make this a translator, which is the one thing it must not look
like.

## 5. The pipeline

`Extract → Route → Compose → Verify → Send and Log`

Schemas in `lib/types.ts` are the source of truth; the prompt contracts are in
[`docs/05-AI-PIPELINE.md`](docs/05-AI-PIPELINE.md).

| Step | In | Out |
| --- | --- | --- |
| Extract | spoken text, spoken-on date, contact roster | `ExtractResult` — facts with values, source spans, privacy tags |
| Route | facts, all contacts, project | `RouteResult` — include, reason, confidence, fact ids per contact |
| Compose | one contact + **only** their allowed facts | `Draft` — body, subject, used fact ids, sentence provenance |
| Verify | draft + contact + allowed facts | deterministic `CheckOutcome` **plus** `VerifyAiResult` |

## 6. Data model

`contacts` · `updates` · `facts` · `messages` · `trail_entries` · `lab_runs`
(+ `demo_usage`). Full field list in
[`docs/04-DATA-MODEL.md`](docs/04-DATA-MODEL.md).

## 7. The standout features, and why I want each one

Acceptance criteria in
[`docs/06-STANDOUT-FEATURES.md`](docs/06-STANDOUT-FEATURES.md).

- **Knowledge Matrix** — a grid of who was told what, and who was deliberately
  not told. For me this is the "did I forget the tester again" check.
- **Fact provenance** — hover a sentence in a draft and see the words I
  actually said. This is what stops me trusting a draft I should have read.
- **Privacy Shield** — "don't tell the client it was the contractor" becomes a
  lock, not a hope. This is the one I would pay for.
- **Trust Trail** — every step hash-chained, with a button that proves nothing
  was altered. More than I need personally; exactly right for anyone asking how
  they know it did what it says.
- **Quality Lab** — my own updates run through the pipeline and scored. The
  difference between claiming accuracy and showing it.
- **Consistency Guard** — "last week you told her Friday, this says Monday".
  `p_adv_04` is that case.
- **Voice Return meter** — words spoken against words delivered. The closing
  shot of the demo.

## 8. Accuracy targets

From [`docs/07-ACCURACY-SYSTEM.md`](docs/07-ACCURACY-SYSTEM.md).

| Metric | Target |
| --- | --- |
| Invented facts | **0 — hard gate** |
| Privacy | **100% — hard gate** |
| Must-know coverage | 95%+ |
| Routing recall / precision | 90%+ / 85%+ |
| Language and script | 100% |
| Tone fit | 4.0/5+ |
| Channel fit | 95%+ |

## 9. Out of scope

- Any messaging API. `wa.me` and `mailto:` only.
- Any login, account or payment.
- Any unofficial Wispr SDK.
- Channels beyond WhatsApp, email and copy.
- Real-time collaboration, teams, multi-user anything.
- Mobile apps.
- Threading or replies. SayOnce sends; it does not receive.
- Calendar or ticket integration. The log is the record.

## 10. What is still open

| Item | Where | Why it is not done |
| --- | --- | --- |
| Baseline minutes per update | §1 | Has to be timed before I start using SayOnce |
| Real contact details | People Book, Phase 2 | Entered by voice; never committed |
| My ten real updates | `p_real_01`–`08` | Dictated over the draft cases once the pipeline runs |

## 11. Changelog

| Phase | Done at | Shipped | Gate result | Open |
| --- | --- | --- | --- | --- |
| 0 | draft | This spec + a 20-case golden set | not yet reviewed | Baseline timing, real contacts |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| D | | | | |
| 8 | | | | |
| 9 | | | | |
