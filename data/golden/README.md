# The golden set

30 spoken updates with, for each one, the recipients who should have been
chosen, the facts each recipient must receive, and anything a recipient must
never receive. It is the contract the Quality Lab grades the pipeline against,
and it is the single most valuable artefact in this repo — a pipeline without
it is a pipeline nobody can tell is getting worse.

## Two files

| File | Status | What it is |
| --- | --- | --- |
| `golden-set.example.json` | committed | Eight seed cases covering every group, safe to share. Written so the pipeline can be exercised on day one. |
| `golden-set.json` | **never committed, never deployed** | Your real 30. Carries real names, real numbers, real projects. |

Start by copying the example, then dictate over it:

```bash
cp data/golden/golden-set.example.json data/golden/golden-set.json
```

## Composition

| Group | Count | What it tests |
| --- | --- | --- |
| `real` | 10 | Your actual job. This is the criterion-1 evidence; nothing else substitutes for it. |
| `hinglish-edge` | 8 | Numbers said in Hindi ("dhai sau"), relative dates ("parso"), English words written in Devanagari, mixed honorifics. |
| `tricky-instruction` | 7 | "Don't tell the vendor", "boss only", negations, mid-sentence corrections, updates that concern nobody. |
| `global` | 5 | Spanish-English, Taglish, Portuguese — the cases that make the global claim checkable. |
| `adversarial` | 4 | Deliberately planted traps: a thin update that invites padding, a person named like a date, a planted leak, a contradiction. |

Thirty-four rows in total once the adversarial group is added in Phase 4. The
plan says thirty; the four adversarial cases are the ones that prove the Verify
step catches what it claims to, so they are not optional.

## Rules

1. **You dictate `spokenText`.** Through Wispr, in your real voice, with your
   real mix of languages. A typed golden set tests a different product.
2. **`spokenOn` is fixed per case.** Relative dates have to grade the same way
   in November as they did in October.
3. **Expectations are facts, not wording.** `mustKnow` lists what the reader
   must learn, not the sentence they should receive. The grader judges meaning.
4. **Every phase re-runs the whole set.** Not the failures — the whole set.
   A fix that breaks an earlier case is not a fix.
5. **Blocked beats must-know.** If a fact appears in both for the same contact,
   the case is wrong. Fix the case.

See `docs/07-ACCURACY-SYSTEM.md` for the targets each run is measured against.
