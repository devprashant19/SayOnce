# Phase 9 — Repo cleanup

**After submission. Not before.**

**Goal:** decide what the repository keeps now that the build is finished, and
remove the scaffolding that only existed to get there.

---

## Preconditions — all three, or stop

- [ ] The entry is **submitted**. Not "nearly ready to submit".
- [ ] The public link is live and smoke tested.
- [ ] `main` is green: `npm run verify:all` and `npm run lab` both pass.

Touching the repo before the entry is in is how a working link breaks at hour
47. If any precondition is unmet, this phase does not start.

## The rule for this phase

> **Ask first. Show the exact list. Wait for a yes.**

This is the one step in [R8](../rules/R8-GIT-DISCIPLINE.md) where the standing
authorization to commit and push does not apply. Removing files changes what
the repo *is*, and that is not your call to make silently.

## Why bother at all

The repo currently carries two different things:

1. **The product** — the app, the tests, the docs that explain how it works.
2. **The scaffolding** — the phase plans, the dictatable prompts, the schedule,
   the cut lines. These existed to get the thing built. Once it is built they
   are process archaeology.

If the repo is ever made public for the hackathon, a reader opening it should
find a product, not a 42-file build plan. The scaffolding also slightly
undersells the work: a phase doc describing what *will* be built reads oddly
next to the thing already built.

## The recommended split

Present this table and let the choice be made per row.

### Remove from the repo — the scaffolding

| Path | What it is |
| --- | --- |
| `docs/phases/` | The ten phase plans, including this one |
| `docs/prompts/` | The context block and the dictatable phase prompts |
| `docs/19-SCHEDULE-2-DAYS.md` | The 48-hour plan |
| `docs/16-RISKS-AND-FALLBACKS.md` | Risks, fallbacks and the backup ideas |
| `docs/02-CHALLENGE-AND-JUDGING.md` | Judging criteria and the judge roster |
| `docs/15-DEMO-SCRIPT-AND-SUBMISSION.md` | The video script and write-up template |
| `docs/17-PRIOR-ART.md` | The patterns borrowed while building |
| `BUILD-PROMPT.md` | The prompt that started the build |
| `SPEC.template.md` | The template for the private spec |
| `.gitmessage` | The commit template |

### Keep — the product

| Path | Why a reader wants it |
| --- | --- |
| `README.md` | What it is and how to run it |
| `docs/01-PRODUCT-BRIEF.md` | The problem and the shape of the solution |
| `docs/03-ARCHITECTURE.md` | The pipeline, and why it is split that way |
| `docs/04-DATA-MODEL.md` | Every table and field |
| `docs/05-AI-PIPELINE.md` | The four steps, their schemas, the schema translation |
| `docs/06-STANDOUT-FEATURES.md` | What each feature guarantees |
| `docs/07-ACCURACY-SYSTEM.md` | **The accuracy argument.** Keep this one above all. |
| `docs/08-UI-UX-RULES.md`, `docs/09-WISPR-INTEGRATION.md` | How the interface and the voice input work |
| `docs/10-JUDGE-DEMO.md`, `docs/11-DEPLOYMENT.md` | How the demo and the deploy work |
| `docs/12-SECURITY-AND-PRIVACY.md` | What is private and how it is enforced |
| `docs/13-TESTING-STRATEGY.md`, `docs/14-LANDING-PAGE.md`, `docs/18-GLOBAL-READINESS.md` | The engineering case |
| `docs/rules/` | The rules the code actually follows |
| `CLAUDE.md`, `AGENTS.md` | So a future agent starts from the same rules |
| `tests/`, `data/golden/golden-set.example.json` | The evidence that it is checked |

`docs/00-INDEX.md` stays, **rewritten** to list only what survived. An index
pointing at deleted files is worse than no index.

## How to remove — keep the local copy

Default to this, which drops the files from the repo while leaving them on
disk:

```bash
git rm -r --cached docs/phases docs/prompts BUILD-PROMPT.md SPEC.template.md
printf '\n# build scaffolding, kept locally\ndocs/phases/\ndocs/prompts/\nBUILD-PROMPT.md\nSPEC.template.md\n' >> .gitignore
git add .gitignore
git commit -m "chore(docs): keep the build scaffolding out of the repo"
git push
```

`git rm -r --cached` is the right verb: the working copy is untouched, so the
phase plans are still there if a later change needs them. Plain `git rm` deletes
them from disk too, and should only be used if that is explicitly wanted.

**History still contains them either way.** This is a private repo and that is
fine. If the files genuinely must be unrecoverable, say so — that needs a
history rewrite and a force push, which is its own decision.

## Then

1. **Rewrite `docs/00-INDEX.md`** to match what is left.
2. **Check every surviving link.** A doc that points at a removed file is a
   broken repo:
   ```bash
   grep -rnoE '\]\(([^)]+\.md)[^)]*\)' --include='*.md' . \
     | grep -v node_modules
   ```
   Resolve each target and confirm it exists.
3. **Re-run the gate**: `npm run verify:all`, `npm run lab`,
   `npm run audit:secrets`. Removing docs should change none of them — if it
   does, something was importing a doc.
4. **Confirm the deployed app is unaffected.** `docs/` was already in
   `.vercelignore`, so it never shipped; re-run the smoke test anyway.
5. **Tag it**: `git tag -a repo-clean -m "Scaffolding removed after submission"`.

## Visibility

Separately worth deciding at this point: the repo is **private**. If it is
going public as part of the submission, make that the last step after the
cleanup, and run the leak audit once more first — a public repo is not
reversible in the way a private one is.

```bash
npm run audit:secrets
git log --all --oneline -S'AIza' -- . | head        # key ever committed?
git log --all --oneline -S'postgres://' -- . | head
```

If either finds anything, the key is rotated **before** the repo goes public,
not after.

## Exit

- [ ] The removal list was presented and approved
- [ ] `docs/00-INDEX.md` matches what remains
- [ ] No surviving doc links to a removed file
- [ ] `verify:all`, `lab` and `audit:secrets` all pass
- [ ] The deployed app still passes the smoke test
- [ ] Tagged `repo-clean`, pushed with `--follow-tags`
