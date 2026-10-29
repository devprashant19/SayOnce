# R8 — Git discipline

The standing authorization and the conventions. This rule **supersedes** the
earlier "do not push unless asked": the repo is
`github.com/devprashant19/SayOnce`, and you commit and push as you work.

---

## The standing authorization

**You may commit and push without asking, for any change that passes
`npm run check`.** No permission needed per commit.

Three things still need asking first, because they are not reversible by a
later commit:

| Action | Why it needs asking |
| --- | --- |
| `git push --force` / `--force-with-lease` | Rewrites published history |
| `git reset --hard`, `git clean -fd` | Destroys uncommitted work, including the gitignored private files |
| Removing files from the repo ([Phase 9](../phases/PHASE-09-REPO-CLEANUP.md)) | Changes what the repo *is* |

Everything else — branching, committing, pushing, tagging, merging — proceed.

## When to commit

**After every fix that passes `npm run check`.** Not at the end of a phase, not
when it feels tidy. One logical change, one commit.

```bash
npm run check          # typecheck + lint + 118 tests, ~20s
git add -A
git commit             # uses .gitmessage as the template
git push
```

Why commit this often on a two-day build: when a prompt change at hour 30
breaks three golden cases that passed at hour 20, `git bisect` finds it in
minutes if the commits are small, and not at all if the phase is one commit.

**Never commit a red state to `main`.** If you need to save broken work, commit
it on the phase branch with `wip:` as the type and fix it before merging.

## Commit messages — Conventional Commits

```
<type>(<scope>): <summary in the imperative, under 72 chars>

Why this change, and what it does. Wrap at 76. Explain the reasoning a
reviewer cannot get from the diff — the diff already says what changed.

Fixes g_tricky_01, which kept both Tuesday and Wednesday.
```

Run this once so the template loads automatically:

```bash
git config commit.template .gitmessage
```

**Types:** `feat` `fix` `perf` `refactor` `test` `docs` `chore` `style` `build`
(plus `wip` on a branch only, never on `main`).

**Scopes**, matching this codebase:

```
extract  route  compose  verify  checker  trail  links  dates  script  scrub
people   log    lab      demo    landing  proof  send   ui     a11y    db
api      prompts  schema  env    deploy   docs   golden
```

### What a good message does here

- **Names the golden case or test it fixes.** `Fixes g_hinglish_01` is worth
  more than three sentences of description.
- **Gives the accuracy before and after** when it moves a metric:
  `Routing recall 0.82 -> 0.94 on the full set.`
- **Says what it does not do.** `Does not touch the Route step; that is Phase 2.`
- **Explains a non-obvious choice**, especially a deliberate false negative or a
  cut line taken.

Never: `fix stuff`, `update`, `wip` on main, or a summary that restates the
filename.

## Branches

One branch per phase, named for it:

```
phase/00-foundation   phase/02-people-book   phase/04-verify-and-lab
phase/03-send-layer   phase/05-log-memory    phase/06-demo-and-ui
phase/07-landing      phase/d-judge-demo     phase/08-proof
```

Commit freely on the branch. At the phase gate, when all six gate items pass:

```bash
npm run verify:all                       # the full gate, build included
npm run lab                              # the full golden set
git checkout main
git merge --no-ff phase/04-verify-and-lab
git tag -a phase-04-gate -m "Phase 4 gate passed: <the lab headline numbers>"
git push origin main --follow-tags
```

`--no-ff` keeps a merge commit, so the history shows where each phase landed.
A fast-forward merge would lose that, and on this project the phase boundary is
the most useful thing in the log.

**Fixes found by the gate review go on the phase branch**, before the merge —
not as follow-up commits on `main`.

## Tags are the rollback points

The gate's "snapshot" item means a **tag**: `phase-04-gate`. Annotated, with the
lab headline in the message.

```bash
git tag -n9 -l 'phase-*'      # every gate, with what it reported
git checkout phase-04-gate    # go back to a known-good state
```

Production deployments get a tag too, so a rollback has a matching source
state: `deploy-2026-10-31-1430`. `ROLLBACK.md` (local, never committed) maps
tags to the host's deployment ids.

## What never gets committed

See [R4](R4-DATA-AND-SECRETS.md). The short version: `SPEC.md`, the real golden
set, `.env*`, `ROLLBACK.md`, `.lab/`. Real names, real phone numbers, keys.

`npm run audit:secrets` catches these in the build. **Run it before any push
that follows a build**, and always before a deploy.

If you ever commit a secret: rotate the key first, then clean history. In that
order — a rotated key makes the leaked one worthless, which a history rewrite
alone does not.

## Attribution

Commits carry the agent as co-author:

```
Co-Authored-By: <agent name> <noreply@…>
```

This is a solo entry built with AI tooling, which is the premise of the
challenge rather than something to hide — the submission has to say which tools
were used. Drop the trailer if you would rather it was not in the history; it
changes nothing else.

## At the end

Once the entry is submitted, [Phase 9](../phases/PHASE-09-REPO-CLEANUP.md)
decides what the repo keeps. **Ask before removing anything** — that step is
the one place in this rule where you stop and wait.
