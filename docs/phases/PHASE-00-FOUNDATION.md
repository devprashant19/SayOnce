# Phase 0 — Foundation and real data

**Hours 0–4.** No app code. The most important four hours of the build.

**Goal:** everything the agents need before anything is built, plus the evidence
that wins criterion 1.

Skipping this is how an entry loses "does it solve a real problem in your own
work" — which is the one criterion that polish cannot rescue.

---

## 1. Wispr setup (30 minutes)

- [ ] Install Wispr Flow with the challenge promo (the month of Pro is included)
- [ ] Select **English plus Hinglish** (or your languages)
- [ ] **Turn on the Flow Bar** — Settings → System. It is hidden by default on
      new installs, and a recording without it loses the evidence that the input
      was spoken.
- [ ] Turn on **Command Mode**
- [ ] Add every contact name, project code and product name to the **Wispr
      Dictionary**. A misspelled vendor name in a message is a visible failure
      that has nothing to do with the pipeline.
- [ ] Register on the challenge site with the **same email** as your Wispr
      account

## 2. The honesty check (30 minutes)

Answer this before writing anything:

> Do I update **five or more real people**, across **two or more languages or
> channels**, as a normal part of my work?

If no, switch to a backup idea now — not at hour 20.
See [../16-RISKS-AND-FALLBACKS.md](../16-RISKS-AND-FALLBACKS.md).

Then, while you are still in the old way of working:

- [ ] **Time five old-style updates.** Write them the way you normally would,
      with a stopwatch. Average the minutes.
- [ ] Put that number in `SAYONCE_BASELINE_MINUTES` in `.env.local`.

This is the only chance to measure the baseline. Once SayOnce exists you cannot
un-know it, and a baseline estimated after the fact is not evidence.

## 3. Dictate SPEC.md (1 hour)

Start from `SPEC.template.md`. Dictate, do not type. Cover:

1. **The problem in your own words**, and the measurable before-state: minutes
   per update, rewrites per update
2. **Users** — you first, then the global user
3. **Contacts**, anonymised: "Contact A = packaging vendor, Hinglish, WhatsApp,
   cares about quantities and dates, never tell about pricing"
4. **The pipeline** — Extract, Route, Compose, Verify, Send and Log, with each
   AI step's input and output schema
5. **The data model** — contacts, updates, facts, messages, trail_entries,
   commitments
6. **The standout features** — one paragraph each with acceptance criteria
7. **Accuracy targets** — copied from [../07-ACCURACY-SYSTEM.md](../07-ACCURACY-SYSTEM.md)
8. **Out of scope**
9. **Changelog** — updated by voice after every phase

The interview is worth doing properly: have the planning agent ask you **one
question at a time** until every section is filled with confidence, and push
back if your problem sounds vague or invented.

## 4. Dictate the golden set (1.5 hours)

The single most valuable artefact in the repo, and the biggest block of words
for your usage card.

```bash
cp data/golden/golden-set.example.json data/golden/golden-set.json
```

Then dictate over it. Composition, groups and format rules are in
[`data/golden/README.md`](../../data/golden/README.md).

| Group | Count |
| --- | --- |
| `real` — your actual updates | 10 |
| `hinglish-edge` | 8 |
| `tricky-instruction` | 7 |
| `global` | 5 |
| `adversarial` (added here, used from Phase 4) | 4 |

**You dictate `spokenText`.** The agent drafts the expectations — recipients,
must-know facts, blocked facts, expected language — and you correct them. That
split is much faster than writing JSON by voice, and the expectations are the
part worth arguing about.

Three rules that save hours later:

- `spokenOn` is fixed per case, so relative dates grade the same way in November
  as in October.
- `mustKnow` lists **what the reader must learn**, not the sentence they should
  receive.
- If a fact appears in both `mustKnow` and `blocked` for the same contact, the
  case is wrong. Fix the case.

## 5. Review the idea (30 minutes)

Run the idea-review prompt ([../prompts/REUSABLE-PROMPTS.md](../prompts/REUSABLE-PROMPTS.md))
against SPEC.md. It acts as a harsh judge, scores the four criteria out of 10,
and names the single weakest point.

If "real problem in your own work" scores below 8, **sharpen the problem story
before building anything**. That score will not improve later by adding features.

---

## Cut line

20 cases instead of 34 — but keep **all 10 `real`** and **all 4
`adversarial`**. Never fewer than 10 real; they are the evidence.

Do not cut the baseline timing or the Wispr setup. Both are cheap and both are
unrecoverable later.

## Exit criteria

- [ ] `SPEC.md` exists, dictated, with all nine sections
- [ ] `data/golden/golden-set.json` exists with at least 20 cases, 10 of them real
- [ ] `SAYONCE_BASELINE_MINUTES` set to a **measured** number
- [ ] The idea review scores ≥8 on "real problem in your own work"
- [ ] Wispr Flow Bar visible, Hinglish selected, Dictionary populated
- [ ] One clip of you dictating saved

## Gate

The standard gate does not fully apply — there is no app yet. The parts that do:

- [ ] **Review score** ≥8 on criterion 1
- [ ] **Wispr log** — words noted, one clip saved
- [ ] **Snapshot** — SPEC.md and the golden set backed up somewhere other than
      this folder, because they are gitignored and a mistaken `git clean` would
      cost you the whole phase
