# Phase 2 — People Book, routing, Knowledge Matrix

**Hours 6–8.** Phase 1 must keep passing.

**Goal:** real contacts, and the app decides who needs each update.

This is the phase that turns the product from "rewrite this five ways" into
"work out who needs to know" — the difference the whole entry rests on.

---

## Build

### 1. Database

- Neon project, connection string in `DATABASE_URL`
- `npm run db:generate && npm run db:migrate` from `lib/db/schema.ts`
- **Then the hand-written append-only migration** for `trail_entries` — see
  [`drizzle.README.md`](../../drizzle.README.md). The hash chain is only a
  guarantee if the table cannot be edited by the code that writes it.
- Persist contacts, updates, facts, messages
- Seed demo contacts **separately** from your real ones; a demo/real toggle
  switches datasets

Every row carries `dataset`. There is no query path from demo mode to
`dataset = 'real'`. See [../rules/R4-DATA-AND-SECRETS.md](../rules/R4-DATA-AND-SECRETS.md).

### 2. People Book screen — `/people`

List, add, edit, archive. Fields exactly as in
[../04-DATA-MODEL.md](../04-DATA-MODEL.md):

name, role, relationship, language (**free text**), channel, phone (E.164,
validated), email (validated), formality, cares_about, never_tell.

- Archive rather than delete, so past messages still resolve.
- `language` is a text input, never a dropdown. The moment it becomes five
  options the product is region-locked.
- Phone is required when channel is whatsapp; email when channel is email. Say
  so at the field, not on submit.

### 3. Voice contact entry

One textarea at the top of the People Book. You dictate:

> "Ramesh, our packaging vendor, speaks Hinglish, WhatsApp, plus 91 98 double
> zero double zero triple zero one, only cares about quantities and dates, never
> tell him about pricing."

The AI fills the form; you review and save. Schema: `ParsedContact` in
`lib/types.ts`, which is already written.

**Unclear fields are highlighted, never guessed.** If you did not say the phone
number, the field is flagged empty — inventing a plausible number would be the
worst possible failure for a tool whose whole claim is that it does not invent
things.

### 4. The Route step

A new AI call between Extract and Compose. Prompt already written:
`lib/ai/prompts/route.ts`. Schema already written: `RouteResult`.

**In:** facts + all contacts + project + who usually hears about this project.
**Out:** `[{ contactId, include, reason, confidence, factIds }]` and
`concernsNobody`.

Then in the UI:

- Recipients shown with name, reason and a checkbox — understandable in two
  seconds
- Confidence below 0.6 shown **unticked** with a "check this" tag
- `concernsNobody` says so plainly instead of showing an empty list

**Replace the Phase 1 stand-in** in `app/api/fanout/route.ts` — the block
labelled `phase1-all-contacts`. Keep the privacy filter that follows it; Route
proposes, the filter enforces.

### 5. Knowledge Matrix

A grid: facts down the side, recipients across the top. Three cell states:

| State | Shown as |
| --- | --- |
| told | a tick |
| deliberately not told | a lock icon, with the reason on hover |
| not relevant | empty |

- Updates live as you tick and untick recipients.
- Click a cell to see which sentence of which draft carries that fact.
- At 360 px: horizontal scroll with a **sticky first column**, not a squashed
  grid.

This is the feature that makes the fan-out legible in a two-minute video, so it
is worth getting the small screen right.

---

## Acceptance criteria

- [ ] Voice entry fills every field correctly for **five dictated descriptions**,
      with no invented phone numbers or emails
- [ ] Routing **recall ≥90%**, **precision ≥85%** on the golden set
- [ ] **Privacy 100%** — a privacy-tagged fact never reaches a blocked person
- [ ] The matrix matches the drafts exactly: every "told" cell has a carrying
      sentence, and no fact appears in a draft whose cell says untold
- [ ] Phase 1's checker still shows **zero invented facts** on all cases
- [ ] `g_tricky_02` (concerns nobody) returns no recipients rather than padding

## Edge cases to test deliberately

- A contact with no phone number
- Two contacts with the same first name
- An update that concerns nobody
- A contact whose `never_tell` overlaps a fact the speaker did not flag
- A contact archived after a message was sent to them

## Cut line

- A **static** Knowledge Matrix instead of a live one — it still reads on camera
- Contact archiving can be a hard delete with a warning
- Voice contact entry can fall back to typing the fields, if the parse is
  fighting you. Note it as a known gap; it is a Phase 6 "nice" rather than a
  product promise.

**Do not cut:** the Route step itself, or the privacy filter after it.

## Gate

Full [standard gate](PHASE-GATE.md), plus:

- [ ] `npm run lab` — the **full** set, with routing recall and precision at
      target and privacy at 100%
- [ ] A before-and-after table showing what the Route step changed versus the
      Phase 1 baseline
