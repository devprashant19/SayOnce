# R1 — TypeScript

`strict: true`, plus `noUncheckedIndexedAccess`, `noImplicitOverride` and
`noFallthroughCasesInSwitch`. The pipeline is four schema boundaries in a row;
types are what stop a routing bug becoming a wrong-recipient message.

## Rules

**No `any`.** It is an ESLint error. Use `unknown` and narrow, or write the
type. `as` casts need a comment saying why the compiler cannot see it.

**One schema file.** Every shape crossing an AI boundary lives in `lib/types.ts`
as a Zod schema, with the TypeScript type derived from it:

```ts
export const Draft = z.object({ /* ... */ });
export type Draft = z.infer<typeof Draft>;
```

Written once, enforced twice — as the model's output format and as the runtime
guard. Never hand-write an interface that duplicates a schema.

**Narrow unions over strings.** `Channel` is `"whatsapp" | "email"`, not
`string`. `CheckCode` is a closed union, so a new failure code forces every
switch to acknowledge it.

**`null`, not `undefined`, for "deliberately absent".** A contact with no phone
has `phone: null`. `undefined` means "not supplied"; `null` means "there isn't
one". The difference matters when the UI has to explain why a send button is
disabled.

**`noUncheckedIndexedAccess` is on, so index access is `T | undefined`.** Use
`arr[0]?.x`, or `arr[0]!` where a preceding length check makes it safe. Do not
turn the flag off.

**Discriminated unions for results, not booleans plus optional fields:**

```ts
type TrailVerdict =
  | { ok: true; length: number }
  | { ok: false; length: number; brokenAtSeq: number; reason: string };
```

The caller cannot read `brokenAtSeq` without checking `ok` first.

**Errors carry what the caller needs.** `AiStepError` holds `step`, so a failure
on one contact's draft can be shown on that card rather than as a generic
message.

**`server-only` on anything that touches a secret or the database.** It makes a
client import a build error rather than a runtime leak.

## Naming

- Files: `kebab-case.ts`. Components: `PascalCase.tsx`.
- Functions say what they return: `factsForContact`, `sendTargetFor`,
  `requestedScript`.
- Booleans read as assertions: `concernsNobody`, `overridden`, `editedByUser`.
- No abbreviations that are not already in the product's vocabulary. `contactId`,
  not `cid`.

## Comments

Match the surrounding density. Comment **why**, not what.

The three pure modules carry a header comment explaining what promise they
enforce, because someone will eventually be tempted to "simplify" them. Both
deliberate false-negative classes in the checker are documented next to the
code that implements them, so a future change has to argue with the reason
rather than rediscover it.

## What not to build

- A generic "AI client" abstraction over one provider.
- A validation layer on top of Zod.
- A repository pattern over Drizzle.
- Barrel files that re-export everything.
- A custom type for anything the SDK already exports.

Two days. One caller does not justify an abstraction.
