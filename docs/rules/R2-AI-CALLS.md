# R2 — AI calls

## The only way to call a model

`aiCall()` in `lib/ai/call.ts`. Nothing else constructs a request.

```ts
const result = await aiCall({
  step: "extract",
  system: EXTRACT_SYSTEM,
  user: extractUser({ /* ... */ }),
  schema: ExtractResult,
});
```

It gives you: the one fixed model, structured output against the schema, one
retry with the schema restated, and an error a person can act on.

## Rules

**One fixed model for the whole build.** `SAYONCE_MODEL`, default
`claude-opus-5-5`. Changing it mid-build invalidates every accuracy score
measured before the change. If it must change, re-run the full lab and say so.

**Structured output, always.** A Zod schema as `output_config.format`. Never
parse a model's prose, never regex a JSON block out of a text response.

**One retry, then fail loudly.** Not a loop. A pipeline that retries until it
passes is a pipeline that eventually talks itself into a wrong answer.

**Never return an empty result as success.** An empty fact list reads as
"nothing to say" and would silently drop half an update.

**There is no `temperature`.** It is not a parameter on the current models and a
request that sends it is rejected. Repeatability comes from a frozen prompt, a
strict schema, and a fixed effort level.

**The grader's effort is frozen.** `SAYONCE_GRADER_EFFORT`, default `low`. Do
not change it during the build; two lab runs are only comparable if the grader
was held still. Record the model and effort with every run.

**Prompts live in `lib/ai/prompts/`, one file per step.** Never inline a system
prompt in a route handler. A prompt in a route is a prompt nobody reviews.

**The model never chooses identity.** `contactId` comes from our loop;
`channel` comes from the contact profile. A model that mislabels which reader a
draft is for would send the boss's version to the vendor.

**Blocked facts never enter a prompt.** Filter before the call. Do not instruct
the model to keep a secret it has been told.

**Parallelise with `allSettled`, not `all`.** One failed draft shows an error on
its own card instead of killing the whole fan-out.

## Writing a prompt

The four step prompts are written to a pattern worth keeping:

1. **Say what the step is for**, in one sentence, in the second person.
2. **A HARD RULES block.** Short imperatives. The things that are correctness,
   not style.
3. **Named sub-sections for the hard cases**: relative dates, corrections,
   numbers spoken in another language, privacy.
4. **Say what to do when it is ambiguous** — and say which way to err. Extract
   blocks a fact for everyone when it cannot tell who was meant, because a fact
   wrongly withheld is recoverable and a fact wrongly leaked is not.
5. **Explain why a field matters** where the model's output is shown to a human:
   "these offsets are shown to the speaker as highlights, so an off-by-ten span
   is a visible bug." Models follow a requirement better when they know what it
   is for.

What not to do:

- Do not re-state the schema in prose. The schema is the schema.
- Do not ask for JSON. Structured output handles it.
- Do not pad with "you are a helpful assistant".
- Do not change a prompt and a checker in the same commit, or you will not know
  which fixed the case.

## Cost

A five-contact fan-out is 12 calls. A 34-case lab run is several hundred.

- Demo samples are **cached**; the guided judge path makes zero calls.
- Live AI on visitor text is capped per session and per day, with a kill switch.
- During the build, run the lab by group (`--group`) and the full set only at a
  gate.

## When a step fails

| Symptom | Likely layer |
| --- | --- |
| A fact is missing that the speaker clearly said | Extract prompt |
| `sourceSpan` highlights the wrong words | Extract prompt |
| A relative date resolves wrongly | Extract prompt; check against `lib/dates.ts` |
| A recipient is included who should not be | Route prompt |
| Everyone gets everything | Route prompt, or the Phase 1 stand-in is still wired up |
| A draft invents a number | Compose prompt, or Extract missed the fact |
| A draft is in the wrong script | Compose prompt; check `requestedScript` reads the label |
| A leak got through | **Filtering bug, not a prompt bug.** Find why the fact reached the prompt. |

That last row matters: a leak is never fixed by improving a prompt.
