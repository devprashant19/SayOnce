# The standout features

Seven features turn SayOnce from a demo into a product. Each one makes an
invisible AI step into something a judge can see and click — that is the
selection criterion, not novelty.

Build order matters: the first five are what the accuracy argument rests on.

---

## 1. Knowledge Matrix — Phase 2

**What the judge sees.** A grid: facts down the side, recipients across the
top. Each cell is one of three states — told, deliberately not told (a lock
icon and the reason), or not relevant. It updates live as you tick and untick
recipients. Click a cell and it shows which sentence of which draft carries
that fact.

**Why it impresses.** It makes the fan-out visible. In a two-minute video it
reads at a glance, where a wall of five drafts does not. It is also the only
place in the product where *what you withheld* is as visible as what you sent.

**Acceptance criteria.**
- Every "told" cell has a sentence in that recipient's draft that carries it.
- No fact appears in a draft whose cell says untold. Any mismatch is a bug in
  the matrix or in Compose, and it must be found out which.
- Updates within one frame of a recipient being ticked or unticked.
- Readable at 360 px — a horizontally scrolling grid with a sticky first column,
  not a squashed one.

---

## 2. Fact provenance — Phase 4

**What the judge sees.** Hover (or tap) any sentence in a draft and the exact
spoken words it came from light up in the original update above. Hover a span of
the original and the sentences carrying it light up.

**Why it impresses.** It proves "no invented facts" visibly, in one gesture,
without the judge having to trust a badge. The base already ships the hover in
one direction.

**Acceptance criteria.**
- Correct for every sentence in five sampled drafts.
- A sentence carrying no fact (a greeting, a sign-off) highlights nothing rather
  than highlighting something plausible.
- Works on touch, not only hover.
- Keyboard reachable: the sentence list is focusable and highlights on focus.

**Depends on** `sourceSpan` being exact, which is Extract's job.

---

## 3. Privacy Shield — Phase 4

**What the judge sees.** Say "don't tell the vendor about the delay" and that
fact gets a padlock. Any draft that would leak it is blocked, with the leaking
phrase struck through in red. A Privacy panel lists every lock and who it
protects against.

**Why it impresses.** It turns a natural spoken instruction into a hard
guarantee. It is also the demo moment that makes the audience lean in, because
everyone has sent something to the wrong person.

**Acceptance criteria.**
- The lock is enforced by **what Compose is handed**, not by instructing the
  model. A blocked fact never enters the Compose prompt.
- The deterministic checker independently catches a leak, by hard value or by
  content overlap, so the guarantee does not depend on the first mechanism alone.
- A planted leak is caught 5 times out of 5 (adversarial golden cases).
- Ambiguous instructions block for everyone, with the reason shown.
- The panel names the instruction in the speaker's own words, not a paraphrase.

---

## 4. Trust Trail — Phase 4

**What the judge sees.** A timeline per update: the spoken text, the extracted
facts, the routing decisions with reasons, each draft, each verify result, every
human edit, every send. Each entry carries a hash of the one before it, and a
**Verify trail** button recomputes the chain — green if nothing was altered, red
at the first broken link if something was.

**Why it impresses.** Tamper-evident accountability for AI-written messages is
rare in a hackathon tool and immediately legible to anyone who has worked in
operations. It is also the answer to "how do I know it did what it says?"

**Acceptance criteria.**
- Append-only in the application *and* in the database.
- `hash = SHA-256(prev_hash + canonicalJson(entry))`, computed server-side only.
  If the client could compute it, the guarantee is theatre.
- Editing a row directly in the database makes Verify turn red **at that row**,
  not merely somewhere.
- A deleted row, an inserted row, and a re-signed row whose successor still
  points at the old hash are all caught. All three are tested.
- Export the trail as JSON.
- Corrections are new entries. Nothing is ever updated.

`lib/trail.ts` and its 12 tests already implement this.

---

## 5. Quality Lab — Phase 4

**What the judge sees.** A page that stores the golden set, runs every case
through the live pipeline on one button, and shows a table per metric with pass
and fail per case, scored against published targets, plus a history of runs.

**Why it impresses.** It is the accuracy argument made checkable. A non-technical
person can read the table and say whether things got better. Very few entries
will have anything like it, and it converts "we take accuracy seriously" from a
claim into a screenshot.

**Acceptance criteria.**
- Runs the same code path as the live app. A lab with its own copy of the
  pipeline measures the wrong thing.
- Deterministic checks and the AI grader both run; the deterministic half is
  never skipped.
- Model and grader effort recorded with each run.
- Run history visible, so improvement is shown rather than asserted.
- Readable by someone who has not seen the code.

`scripts/quality-lab.mjs` already does the command-line half.

---

## 6. Consistency Guard — Phase 5

**What the judge sees.** Before showing drafts, it compares the new facts with
what each recipient was told before on the same project in the last 30 days. If
a date, quantity, price or decision changed: *"Last Tuesday you told Ramesh
delivery is Friday; this says Monday. Add a correction line?"* — with three
options: add the correction, ignore, or mark the earlier fact superseded.

**Why it impresses.** It catches the expensive real-world mistake, and it uses
*history* rather than only the current input — which is the difference between
a tool you try and a tool you keep.

**Acceptance criteria.**
- Catches 5 of 5 planted contradictions.
- Raises **no false alarm** on 5 consistent follow-ups. A guard that cries wolf
  gets dismissed, which is worse than no guard.
- The choice is logged in the trail.
- The correction line it offers uses only facts from the two updates.

---

## 7. Voice Return meter — Phase 5

**What the judge sees.** Per update and per week: *"You spoke 84 words; SayOnce
delivered 412 words to 5 people in 3 languages; about 14 minutes saved."*

**Why it impresses.** It quantifies Wispr's value *inside the product*. It is
the perfect closing shot of the demo and the single number a Wispr judge is
most likely to remember.

**Acceptance criteria.**
- Every figure computed, never estimated by a model. `lib/voice-return.ts`.
- Minutes saved is `null` — and shown as nothing, not as a guess — until a real
  baseline exists. The baseline is your own measured minutes per update from
  Phase 0, and the elapsed time is measured by the app from opening Speak to the
  last send.
- Never negative.
- Languages counted distinctly, not per contact: two Devanagari readers are one
  language.
- Matches a hand calculation for three updates.

---

## Worth adding only if the clock allows

In this order. Each is genuinely optional; none of them is worth a failed gate.

| Feature | What it does | Cost |
| --- | --- | --- |
| **Commitments tracker** | Promises in an update ("I'll send the invoice by Thursday") become dated items. Promises others made to you get a one-click polite follow-up in their language. | Medium. Extract already tags `commitment` facts, so the hard part is done. |
| **Voice command bar** | Ctrl/Cmd+K, then dictate: "send everyone except Ramesh", "make the boss version shorter", "switch Priya's to Hindi". Maps to `{action, targets, params}`; confirms before anything destructive. | Medium. Phase 6. Great on camera. |
| **Script toggle** | Hindi drafts switch between Devanagari and Roman for readers who manage either. | Small. Phase 6. |
| **Weekly digest** | One click builds a manager summary from the week's log. | Small, once the log exists. |
| **"Who did I forget?"** | Warns when a contact who usually hears about this project (3 of the last 5) was not selected. | Small. Phase 5. Listed here because it is easy to drop and easy to re-add. |
