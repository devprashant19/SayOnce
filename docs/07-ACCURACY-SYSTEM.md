# The accuracy system

**Zero invented facts is a hard rule. Everything else has a target.**

A message to your boss with a wrong date is worse than no tool at all, so fact
fidelity is never traded for nicer wording. If a phase has to choose between a
draft that reads beautifully and a draft that is provably true, it ships the
true one.

## The golden set

30 spoken updates, **dictated by you through Wispr**, plus 4 adversarial cases
added in Phase 4. For each: the correct recipients, the facts each recipient
must receive, and anything a recipient must never receive.

| Group | Count | What it tests |
| --- | --- | --- |
| `real` | 10 | Your actual job. This is the criterion-1 evidence and nothing substitutes for it. |
| `hinglish-edge` | 8 | Numbers said in Hindi ("dhai sau"), relative dates ("parso"), English words written in Devanagari, mixed honorifics |
| `tricky-instruction` | 7 | "Don't tell the vendor", "boss only", negations, mid-sentence corrections, an update that concerns nobody |
| `global` | 5 | Spanish-English, Taglish, Portuguese — the cases that make the global claim checkable |
| `adversarial` | 4 | A thin update that invites padding, a person named like a date, a planted invented fact, a planted leak |

Files, composition rules and the format are in
[`data/golden/README.md`](../data/golden/README.md). Eight seed cases are
committed as `golden-set.example.json`; your real 34 live in
`golden-set.json`, which is **never committed and never deployed**.

For realistic test inputs, borrow sentence styles from the **HinGE** dataset
(human-written Hinglish with parallel Hindi and English) and **COMI-LINGUA**
(the largest annotated Hinglish dataset). The COMI-LINGUA paper also lists the
typical model mistakes on Hinglish — English words written in Devanagari script
chief among them — which is exactly what the `hinglish-edge` group should catch.

## The targets

Checked at every phase gate, on the whole set, not just the cases you touched.

| Metric | How it is checked | Target |
| --- | --- | --- |
| **Invented facts** | Every number, date and name in a draft must exist in the facts given to that contact. Checked by `lib/checker.ts` and independently by the reviewer. | **0 — hard gate** |
| **Privacy** | No blocked fact reaches a blocked person, by hard value or by content overlap. | **100% — hard gate** |
| Must-know coverage | Each recipient's required facts appear in their draft. Paraphrase counts; vagueness does not. | 95%+ |
| Routing recall | Correct recipients suggested | 90%+ |
| Routing precision | No recipient suggested who should not be | 85%+ |
| Language and script | Hindi in Devanagari when asked, Hinglish in Roman, English stays English. By Unicode range. | 100% |
| Tone fit | Formality match, graded 1–5 | 4.0 average or more |
| Channel fit | WhatsApp drafts short and plain; emails carry a subject | 95%+ |

The two hard gates are not averages and not negotiable. One invented fact in
one case fails the run. `scripts/quality-lab.mjs` exits with code 2 when a hard
gate fails and 1 when a soft target is missed, so it can gate a deploy.

## How the checks run

Three layers, and the order is deliberate.

### 1. Deterministic, always

`lib/checker.ts`. No model, pure functions, 22 tests. Catches invented numbers,
dates and names; blocked-fact leaks; wrong script; channel breaches; and a draft
claiming a fact it was never given.

**Anything a plain function can check is checked by a plain function.** This is
the whole reason the accuracy claim is defensible.

### 2. AI grading, for meaning

Only for what arithmetic cannot judge: whether a required fact actually reached
the reader in some wording, whether a claim was smuggled in as phrasing, and
tone fit.

LLM graders drift between runs. Gemini accepts `temperature`, so the grader
runs at **0** (`SAYONCE_GRADER_TEMPERATURE`) and that value must not change
during the build. Repeatability also needs a frozen prompt, a schema that
constrains decoding, and an explicit pass criterion written into the rubric.

Record the model and the temperature with every run so no score is compared
across configurations by accident.

### 3. Human, before the demo

One native speaker per language reads five drafts each and marks anything
unnatural. Fix, then **re-run the full set**. A fluent-looking draft that a
native speaker finds stilted will read the same way to a judge.

## Running it

```bash
npm run dev                                  # the pipeline lives behind the route
npm run lab                                  # the real set, falls back to the example
npm run lab -- --example                     # the committed seed cases
npm run lab -- --group tricky-instruction    # one group, during the build
npm run lab -- --case g_real_01              # one case, while debugging
```

Runs are saved to `.lab/run-*.json`, so improvement is visible rather than
claimed. From Phase 4 the same thing runs on the `/lab` page, through the same
code path — a lab with its own copy of the pipeline measures the wrong thing.

Optionally run the same golden set through **promptfoo** from the command line
after a change, as a second opinion. Either way, mix exact checks with
AI-graded ones.

## Fixing a failure

The order matters, because fixing at the wrong layer is how a pipeline
accumulates patches that each solve one case.

1. **Reproduce it first.** Show the evidence. If you cannot reproduce it, say
   so and ask — do not guess.
2. **Name the layer.** Prompt, schema, checker, routing, date logic, data, UI,
   send links, infrastructure. One line.
3. **Fix at that layer, with the smallest change that solves it.** Do not
   refactor unrelated code.
4. **Add a regression check** that fails without the fix: a golden case, a unit
   test, or a scripted check.
5. **Re-run everything.** The full lab and every earlier phase's acceptance
   checks — not just the item you fixed.
6. **If a fix breaks something else, revert and rethink** rather than stacking
   patches.

## Deliberate non-goals of the checker

Two false-negative classes are accepted on purpose, because the alternative is
worse:

- **An unrecognised language gets no script requirement.** Blocking a draft in
  a language we do not model would be a wrong block, and wrong blocks erode
  trust in the badge faster than missed checks do.
- **A capitalised word that only ever starts a sentence is not treated as a
  name.** Hinglish drafts open lines with "Baaki", "Kal", "Aaj". The AI verify
  layer still reads for smuggled names.

Both are documented in `lib/checker.ts` next to the code that implements them.
If a future change makes the checker stricter here, it needs a test showing it
does not block a legitimate Hinglish draft.
