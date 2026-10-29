# The 48-hour plan

**Now:** Thursday 29 October 2026.
**Deadline:** Saturday 31 October, 23:59 IST.

Every phase gets built. The schedule makes that fit by **cutting inside phases,
never cutting a phase** — each phase below has a hard stop and a named cut line.

Phase 1 is already built and verified in this repo, which is why the plan
starts at hour 0 with Phase 0 and Phase 2 rather than with a scaffold.

## The shape of it

| Block | Hours | What |
| --- | --- | --- |
| **Day 1 morning** | 0–4 | Phase 0: Wispr setup, SPEC.md, the golden set |
| **Day 1 midday** | 4–8 | Phase 1 verification + Phase 2: database, People Book, Route, Knowledge Matrix |
| **Day 1 afternoon** | 8–11 | Phase 3: send layer, on a real phone |
| **Day 1 evening** | 11–17 | Phase 4: Verify, provenance, Privacy Shield, Trust Trail, Quality Lab |
| **Sleep** | 17–24 | Non-negotiable. Hour 30 with no sleep is worse than hour 20 with. |
| **Day 2 morning** | 24–28 | Phase 5: Update Log, learning, Consistency Guard, Voice Return |
| **Day 2 midday** | 28–32 | Phase 6: demo mode, global, command bar, UI pass |
| **Day 2 afternoon** | 32–36 | Phase 7: landing page |
| **Day 2 late afternoon** | 36–39 | Phase D: judge demo + deploy. **The link must be live by hour 39.** |
| **Day 2 evening** | 39–45 | Phase 8: real use, `/proof`, the video, the write-up |
| **Buffer** | 45–48 | Submit. Freeze. Nothing new. |

Real use in Phase 8 is compressed from two days to "every multi-person update
you have between hour 39 and hour 45, plus a timed baseline". Say so honestly in
the write-up — a measured half-day beats a claimed two days.

---

## Day 1

### Hours 0–4 · Phase 0 — Foundation

**The most important four hours of the build.** Skipping this is how an entry
loses criterion 1, which is the one criterion polish cannot rescue.

| Hour | Do |
| --- | --- |
| 0.0–0.5 | Wispr: install with the promo, select English + Hinglish, **turn on the Flow Bar** (Settings → System), turn on Command Mode, add every contact name and project code to the Dictionary. Register with the same email. |
| 0.5–1.0 | **The honesty check.** Do you update 5+ real people across 2+ languages or channels? If not, switch to a backup now ([16-RISKS-AND-FALLBACKS.md](16-RISKS-AND-FALLBACKS.md)). Then time five old-style updates to get your real baseline minutes. |
| 1.0–2.0 | Dictate `SPEC.md`: your role, your 5–10 real contacts (anonymised), three real updates from last week and how you rewrote each, and the baseline. |
| 2.0–3.5 | **Dictate the golden set.** All of it, through Wispr. This is also the biggest single block of words for your usage card. |
| 3.5–4.0 | Run the idea-review prompt on SPEC.md. Fix the problem story if it scores below 8 on "real problem". |

**Cut line:** 20 cases instead of 34 — but keep all 10 `real` and all 4
`adversarial`. Never fewer than 10 real.

**Exit:** `SPEC.md` and `data/golden/golden-set.json` exist. Review scores ≥8 on
criterion 1. `SAYONCE_BASELINE_MINUTES` is set to a measured number.

### Hours 4–8 · Phase 1 check + Phase 2

Start by proving the base works for *you*:

```bash
cp .env.example .env.local     # add ANTHROPIC_API_KEY
npm run verify:all             # 90 tests, typecheck, lint, build
npm run dev
npm run lab -- --group real    # your own 10 cases through the real pipeline
```

If the real cases do not pass, that is Phase 1 work and it comes before Phase 2.
Do not build on a pipeline that fails your own updates.

Then Phase 2: Neon database, migrations, the append-only trail migration, the
People Book with voice contact entry, the Route step, and the Knowledge Matrix.

**Cut line:** a static Knowledge Matrix instead of a live one. Contact
delete-as-archive can be a later concern.

### Hours 8–11 · Phase 3 — Send layer

The send-test page, then **a real phone**. This is the block people skip and
regret, because a broken Devanagari WhatsApp message is only visible on a
device.

**Cut line:** "Send all" guided queue. Individual send buttons are enough.

### Hours 11–17 · Phase 4 — Verify and the Quality Lab

The longest block, and the one that wins the accuracy argument. Split it:

- 11–14: the AI Verify layer, the regeneration loop, provenance both ways, the
  Privacy Shield panel
- 14–17: the Trust Trail UI with the Verify button, the tamper test, and the
  `/lab` page

**Cut line:** the `/lab` page can be a plain table with no run history. The
command-line runner already exists, so a judge still sees numbers.

**Do not cut:** the deterministic checker wiring, the regeneration loop, or the
tamper test. Those three are the entry.

### Hours 17–24 · Sleep

Yes, really. The failure mode of a 48-hour build is not running out of hours —
it is making an unrecoverable mistake at hour 30 because nobody had slept.

---

## Day 2

### Hours 24–28 · Phase 5 — Log and memory

Update Log with filters and CSV, voice feedback that changes a profile,
Consistency Guard, commitments, Voice Return meter, "Who did I forget?".

**Cut line:** commitments tracker and the weekly digest. Keep the log, the
feedback loop and Voice Return — the first is the "record writes itself" claim,
the second is the most alive-feeling moment in the demo, and the third is the
closing shot.

### Hours 28–32 · Phase 6 — Demo mode, global, UI pass

Demo mode with the two datasets and **cached sample results** (this is what
makes Phase D cheap). The design pass across every screen at three widths and
both themes. Accessibility to AA.

**Cut line:** the voice command bar and the script toggle.

**Do not cut:** cached sample results, or the accessibility pass. The first is
load-bearing for judging; the second is a published criterion.

### Hours 32–36 · Phase 7 — Landing page

Six scenes, the interactive strip, the View Transitions handoff.

**Cut line:** scenes degrade in the order given in
[14-LANDING-PAGE.md](14-LANDING-PAGE.md). Three good scenes beat six rushed
ones.

### Hours 36–39 · Phase D — Judge demo and deploy

**The hard deadline inside the deadline: the public link must be live and smoke
tested by hour 39.** Everything after this point is evidence-gathering on a
working deployment.

- 36.0–37.0: demo sessions, caps, kill switch, the guided tour, Reset demo
- 37.0–37.5: pre-flight (`verify:all`, `lab`, `audit:secrets`)
- 37.5–38.0: preview deploy, smoke test on the preview URL
- 38.0–38.5: promote to production, warm the caches, record the deployment id
- 38.5–39.0: `ROLLBACK.md`, uptime monitor, full smoke test on production, 20
  concurrent demo sessions

### Hours 39–45 · Phase 8 — Real use, proof, video, write-up

- 39–42: **use it for real.** Every multi-person update you have. Record the
  count, the message count, and the elapsed time per update (the app measures
  this). Get one or two recipient reactions if anyone notices their message
  arrived in their own language.
- 42–43: `/proof`, and replace every "sample" number on the landing page with a
  measured one — or keep the label.
- 43–44.5: record the video. One take per segment. Wispr bar visible.
- 44.5–45: dictate the write-up and the README. Take the usage card screenshot
  **after** the write-up, so it counts those words.

### Hours 45–48 · Submit and freeze

- Full pre-submission audit ([12-SECURITY-AND-PRIVACY.md](12-SECURITY-AND-PRIVACY.md))
- Submit: demo link first, then the app link, video, usage card, write-up
- Post with #NoHandsChallenge, tagging WeMakeDevs and Wispr Flow
- **No deploys.** Nothing new. If something is genuinely broken, fix it and
  re-run the full smoke test; otherwise stop.

---

## The three checkpoints

Stop and answer honestly. A no discovered late is much more expensive than a no
discovered on time.

| Hour | Question | If no |
| --- | --- | --- |
| 1 | Is this a real problem in my own work, with 5+ contacts across 2+ languages? | Switch to a backup. Now, not later. |
| 17 | Do all 10 real golden cases pass with zero invented facts and 100% privacy? | Stop adding features until they do |
| 39 | Is the link live, smoke tested, working in a private window on a phone with no login? | Drop everything else until it is |

## What "every phase gets built" means in practice

It means every phase's **core** ships and every phase's **gate** is run. It does
not mean every optional feature in every phase doc. The cut lines above are
pre-authorised: taking one is executing the plan, not failing it.

What is never pre-authorised:

- skipping a gate
- skipping the full Quality Lab run at a gate
- skipping the leak audit before a deploy
- skipping sleep
- deploying in the last three hours without a smoke test
