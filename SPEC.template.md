# SPEC.md — SayOnce

> Copy this to `SPEC.md` and **dictate** over it in Phase 0. `SPEC.md` is
> gitignored and never deployed: it holds your real role, real contacts and real
> projects.
>
> It is a living document. Update it by voice after every phase. It is also the
> context that carries across agents when one hits a usage limit — which on a
> two-day build is a question of when, not if.
>
> **Back it up somewhere other than this folder.** It is gitignored, so a
> mistaken `git clean` would cost you the whole of Phase 0.

---

## 1. The problem, in my words

[Dictate this. Not a product description — the actual annoyance. Who you rewrite
the same facts for, how many times a day, and what goes wrong when you don't.]

**The measurable before-state**, timed on five real updates before SayOnce
existed:

| | |
| --- | --- |
| Minutes per update | [X] |
| Rewrites per update | [N] |
| People per update | [N] |
| Languages involved | [list] |
| Channels involved | [list] |
| How often the tracker actually gets filled in | [honestly] |

Set `SAYONCE_BASELINE_MINUTES=[X]` in `.env.local`. **This is the only chance to
measure it.** A baseline estimated after the tool exists is not evidence.

## 2. Users

**Me first.** [Your role, your team, your week.]

**Then:** anyone who coordinates people across languages and channels — five to
ten regular contacts, at least two languages or channels. Operations, project
coordination, sales, HR, founders, school admins, event organisers.

## 3. Contacts — anonymised

Real names, numbers and projects stay out of anything that could be committed.
Use labels here and keep the mapping in your head or in a separate local file.

| Label | Role | Relationship | Language and script | Channel | Formality | Cares about | Never tell |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Contact A | [e.g. packaging vendor] | [our supplier] | [Hinglish, Roman] | whatsapp | neutral | [quantities, dates] | [our margins] |
| Contact B | | | | | | | |
| Contact C | | | | | | | |
| Contact D | | | | | | | |
| Contact E | | | | | | | |

Five minimum. Ten is better. If you cannot fill five honestly, read
[`docs/16-RISKS-AND-FALLBACKS.md`](docs/16-RISKS-AND-FALLBACKS.md) before
building anything.

## 4. Three real updates from last week

For each one: what you said, and how you rewrote it for each person. This is
what the `real` golden group is built from.

### Update 1 — [date, project]

**What happened:** [one or two sentences]

| Person | What they got | What you left out, and why |
| --- | --- | --- |
| Contact A | | |
| Contact B | | |

**Minutes it took:** [X]

### Update 2 — [date, project]

[same shape]

### Update 3 — [date, project]

[same shape]

## 5. The pipeline

`Extract → Route → Compose → Verify → Send and Log`

Schemas are in `lib/types.ts` and are the source of truth; the prompt contracts
are in [`docs/05-AI-PIPELINE.md`](docs/05-AI-PIPELINE.md).

| Step | In | Out |
| --- | --- | --- |
| Extract | spoken text, spoken-on date, contact roster | `ExtractResult` — facts with values, source spans, privacy tags |
| Route | facts, all contacts, project | `RouteResult` — include, reason, confidence, fact ids per contact |
| Compose | one contact + **only** their allowed facts | `Draft` — body, subject, used fact ids, sentence provenance |
| Verify | draft + contact + allowed facts | deterministic `CheckOutcome` **plus** `VerifyAiResult` |

## 6. Data model

`contacts` · `updates` · `facts` · `messages` · `trail_entries` · `lab_runs`
(+ `demo_usage`)

Full field list in [`docs/04-DATA-MODEL.md`](docs/04-DATA-MODEL.md).

## 7. Standout features

One paragraph each with acceptance criteria. Written out in
[`docs/06-STANDOUT-FEATURES.md`](docs/06-STANDOUT-FEATURES.md); restate here in
your own words so the agent hears your version.

- Knowledge Matrix — [your words]
- Fact provenance — [your words]
- Privacy Shield — [your words]
- Trust Trail — [your words]
- Quality Lab — [your words]
- Consistency Guard — [your words]
- Voice Return meter — [your words]

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
- [anything else you decide to rule out — write it down, so it stops being
  relitigated at hour 30]

## 10. Changelog

Updated by voice after every phase. One line each: what shipped, what the gate
reported, what is still open.

| Phase | Done at | Shipped | Gate result | Open |
| --- | --- | --- | --- | --- |
| 0 | | SPEC.md, golden set, idea review | | |
| 1 | | Core pipeline verified against my cases | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| D | | | | |
| 8 | | | | |
