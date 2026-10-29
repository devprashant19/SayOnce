# Agent guidelines

See [CLAUDE.md](CLAUDE.md). It is the single source for engineering principles,
the hard rules, the phase map, the gate, and what is already built.

Start with [docs/00-INDEX.md](docs/00-INDEX.md).

Two things worth knowing before anything else:

1. **The base is built and 90 tests pass.** `lib/checker.ts`, `lib/trail.ts` and
   `lib/links.ts` are tested and carry the product's promises. A phase doc that
   describes them is documenting what exists, not asking you to build it.

2. **`npm run verify:all` before you change anything.** If it does not pass on a
   clean checkout, that is the first bug.

This file is committed so every agent starts from the same rules, and kept
out of the deployed bundle by `.vercelignore`.
