# Data model

Defined in `lib/db/schema.ts` (Postgres, Drizzle) and mirrored as Zod schemas
in `lib/types.ts`. Phase 1 runs from fixtures; the database is required from
Phase 2.

## Two rules that shape every table

**1. Demo data and real data never mix.** Every row carries `dataset`: either
the literal `'real'`, or a signed demo session id. A demo-mode query can only
ever see rows for its own session. This is what makes a public, no-login app
safe to ship, and it is the reason a judge pressing buttons cannot see your
contacts or affect another judge's session.

**2. `trail_entries` is append-only.** No `UPDATE`, no `DELETE`, ever. A
correction is a new row. Enforce it in the database as well as the application
(see `drizzle.README.md`) — the hash chain is only a guarantee if the table
cannot be edited by the code that writes it.

## contacts

One row per person you update.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text, pk | |
| `dataset` | text | `'real'` or a demo session id |
| `name` | text | |
| `role` | text | "Packaging vendor", "Operations Head" |
| `relationship` | text | "my manager", "our packaging supplier" — drives tone |
| `language` | text | **Free text, deliberately.** "Hindi, Devanagari", "Brazilian Portuguese, informal", "Hinglish, Roman script". Never an enum; this is what makes the product region-neutral. |
| `channel` | text | `whatsapp` or `email` |
| `phone` | text, null | E.164 with country code, validated. Required when channel is whatsapp. |
| `email` | text, null | Validated. Required when channel is email. |
| `formality` | text | `casual` / `neutral` / `formal` |
| `cares_about` | text | What they actually need. Read by Compose as a priority instruction, not a filter. |
| `never_tell` | jsonb string[] | Standing topics. Route and Compose must both respect these. |
| `learned_rules` | jsonb string[] | Accepted voice-feedback rules, newest last. Phase 5. |
| `profile_version` | integer | Bumped on each accepted change, so a draft can cite which version wrote it. |
| `created_at` | timestamptz | |
| `archived_at` | timestamptz, null | Soft delete; a deleted contact's past messages must still resolve. |

## updates

One row per spoken update.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text, pk | |
| `dataset` | text | |
| `created_at` | timestamptz | |
| `spoken_on` | text | `YYYY-MM-DD`. Separate from `created_at` so relative dates resolve against the day it was *said*, and grade the same way forever. |
| `time_zone` | text | |
| `project` | text | |
| `raw_text` | text | **Already scrubbed.** The unscrubbed string is never stored. |
| `summary` | text | One line the speaker would recognise as their own |
| `decisions` | jsonb string[] | |
| `elapsed_seconds` | integer, null | Opening Speak to last send. Measured, not estimated. Feeds Voice Return and `/proof`. |

## facts

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text, pk | |
| `update_id` | text | |
| `text` | text | One actionable thing, in the language it was spoken |
| `type` | text | `date` / `quantity` / `person` / `place` / `status` / `decision` / `ask` / `commitment` |
| `values` | jsonb | `{ numbers[], datesIso[], names[] }` — the hard values the checker compares against |
| `source_span_start` / `_end` | integer | Character offsets into `updates.raw_text`. Powers the provenance highlight, so an off-by-ten span is a visible bug. |
| `blocked_for` | jsonb string[] | Contact ids that must never receive this fact |
| `blocked_reason` | text | The instruction in the speaker's own words, shown in the Privacy panel |
| `commitment_owner` | text, null | Phase 5. `'me'` or a contact id |
| `commitment_due` | text, null | |
| `commitment_status` | text, null | `open` / `done` / `dropped` |

## messages

One row per draft, per contact, per update.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text, pk | |
| `update_id`, `contact_id` | text | |
| `channel` | text | Copied from the contact at compose time, so a later profile change does not rewrite history |
| `subject` | text, null | Required for email |
| `body` | text | |
| `used_fact_ids` | jsonb string[] | The draft's own claim; the checker verifies it |
| `sentences` | jsonb | `[{ sentence, factIds[] }]` — sentence-level provenance |
| `check_ok` | boolean, null | Deterministic checker. Null = not yet checked. |
| `check_failures` | jsonb | The `CheckFailure[]` the checker returned |
| `tone_score` | real, null | AI verify layer, 1–5 |
| `verify_issues` | jsonb string[] | |
| `overridden` | boolean | True when sent despite a failed check. Always logged in the trail. |
| `sent` | boolean | Auto-set when a send button is used; editable |
| `sent_at` | timestamptz, null | |
| `edited_by_user` | boolean | Whether the human changed the body before sending |

## trail_entries

Append-only. The Trust Trail.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text, pk | |
| `update_id` | text | |
| `seq` | integer | 1-based, unique per update. A gap or a duplicate fails verification. |
| `at` | timestamptz | |
| `actor` | text | `user` / `ai` / `system` |
| `type` | text | `spoken` / `extracted` / `routed` / `composed` / `verified` / `scrubbed` / `edited` / `override` / `sent` / `exported` / `profile-change` / `consistency-choice` / `command` |
| `payload_json` | jsonb | |
| `prev_hash` | text | Previous entry's hash; the first entry uses 64 zeroes |
| `hash` | text | `SHA-256(prev_hash + canonicalJson(entry without hash))`, computed **server-side only** |

Canonical JSON means keys sorted at every depth and no incidental whitespace —
see `lib/trail.ts`. Two runs over the same data must produce identical bytes or
the chain is worthless.

## lab_runs

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text, pk | |
| `started_at` | timestamptz | |
| `model` | text | Recorded so a score is never compared across models by accident |
| `grader_temperature` | real | Same reason |
| `case_count` | integer | |
| `scores` | jsonb | One number per metric |
| `per_case` | jsonb | Pass/fail and the failure reasons per case |
| `passed` | boolean | Every target met |

## demo_usage

Per-visitor and per-day live-AI accounting for the judge demo.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text, pk | |
| `session_id` | text | The signed demo session id |
| `day` | text | `YYYY-MM-DD`, UTC |
| `calls` | integer | |
| `last_at` | timestamptz | |

Unique on `(session_id, day)`.

## Relationships

```
updates 1──n facts
updates 1──n messages        n──1 contacts
updates 1──n trail_entries   (append-only, ordered by seq)
```

A fact belongs to exactly one update. A message references exactly one contact
and one update. Nothing cascades on delete, because nothing is deleted — a
removed contact is archived so its past messages still resolve.

## What is never stored

- The unscrubbed spoken text. `lib/scrub.ts` runs before the first write.
- Anything that looks like a password, OTP, card number, bank account or
  Aadhaar-style id. Masked, with the masking itself recorded in the trail.
- The golden set. It lives on your machine, in a gitignored file, and is never
  uploaded. It carries real names and real phone numbers.
- API keys, in any table or any client bundle.

## What `/proof` may read

Only aggregates from the real dataset, passed through `anonymise()`:
update count, message count, language count, measured minutes before and after,
the latest lab scores, and the trail verification status. **No name, no phone
number, no email address appears on that page**, and the pre-submission audit
(`npm run audit:secrets`) fails the build if one does.
