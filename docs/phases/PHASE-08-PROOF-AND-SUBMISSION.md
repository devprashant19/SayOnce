# Phase 8 — Real use, proof, demo and submission

**Hours 39–45, then submit by 48.**

**Goal:** turn real use into evidence, then submit.

**Do not add features. Fix only what real use breaks.** Every hour spent on a
new feature here is an hour not spent on the evidence that wins criterion 1 —
and criterion 1 is the one that cannot be recovered by polish.

---

## 1. Use it for real — hours 39–42

Every multi-person update you have, through SayOnce.

Record:

- [ ] Number of updates sent
- [ ] Number of messages generated
- [ ] **Minutes per update, before and after.** Before is your Phase 0 baseline
      (`SAYONCE_BASELINE_MINUTES`, timed on five old-style updates). After is
      measured by the app: `updates.elapsed_seconds`, from opening Speak to the
      last send.
- [ ] Languages used
- [ ] Any draft you had to fix, and why — this is the most honest signal in the
      whole entry, and it belongs in the write-up

Also collect, if anyone offers it: **two short quotes from recipients** who
noticed their message arrived in their own language. One sentence each is plenty,
and it is worth more than any metric.

### On the compressed window

The original plan called for two working days of real use. The two-day deadline
compresses it to the hours between the deploy and the recording.

**Say so honestly in the write-up.** "Three hours of real use across six
updates, with the minutes measured by the app" is credible. "Two days of real
use" when it was three hours is the kind of thing a judge can sometimes tell,
and it would cast doubt on every other number.

A measured half-day beats a claimed two days.

## 2. The evidence dashboard — `/proof`

Linked from the landing page footer. Reads the **real** dataset.

Shows:

- Updates sent, messages delivered, languages used
- Average minutes per update **before** (the baseline) and **after** (measured)
- The latest Quality Lab scores
- Trust Trail verification status across every update

**Anonymised.** `anonymise()` strips names, phone numbers and email addresses.
**No name, no phone number, no email address appears on that page** — and
`npm run audit:secrets` fails if one does.

Every number traces to stored data. If a figure has no data behind it, the page
says so rather than showing a zero.

## 3. Replace the sample numbers — hour 42–43

Every number on the landing page labelled "sample" in Phase 7 gets replaced with
the measured one, **or keeps the label**.

There is no third option. A number that looks measured and is not is the single
worst thing on the page.

## 4. Prepare the demo state

- A clean demo dataset
- Cached samples warm
- A fresh real update ready to dictate on camera — one you have not already sent,
  so the fan-out is genuine

## 5. Record the video — hours 43–44.5

Shot by shot in [../15-DEMO-SCRIPT-AND-SUBMISSION.md](../15-DEMO-SCRIPT-AND-SUBMISSION.md).

The rules that matter most:

- **Wispr Flow Bar visible throughout.** Settings → System; hidden by default.
- **Every input visibly dictated.** A typed demo loses criterion 2 outright.
- **Real contacts, numbers blurred.**
- **One take per segment, then cut.** Do not try it live in one pass.
- **Record on a warm cache** so there is no spinner.
- **Do not narrate the UI.** Say what it means, not what it does.

## 6. Dictate the write-up and the README — hours 44.5–45

Template in [../15-DEMO-SCRIPT-AND-SUBMISSION.md](../15-DEMO-SCRIPT-AND-SUBMISSION.md).

The write-up covers: the problem, who it is for, what it does, how Wispr was
used, and the results with real numbers.

The README is public, so no secrets and no golden set: what it is, how to run it,
how accuracy is checked, what is out of scope, the challenge credit.

Then take the usage card screenshot from **Insights** — **after** the write-up is
dictated, so those words count.

## 7. The pre-submission audit

```bash
npm run verify:all
npm run lab
npm run audit:secrets
grep -r "sk-ant-\|postgres://" .next/static/ || echo clean
```

Then by hand:

- [ ] Click every link and button on landing, `/app`, `/demo` and `/proof`, at
      360 px and 1440 px
- [ ] Confirm `/proof` shows no name, phone number or email
- [ ] Confirm the deployed site **and its source maps** contain no key, no real
      number, no real address
- [ ] Confirm `SPEC.md`, the golden set and the agent instruction files are not
      in the uploaded file list
- [ ] Check the Open Graph preview by pasting the link into WhatsApp
- [ ] Open the demo link in a private window **on a phone**

## 8. Submit — hours 45–48

In this order:

1. **The judge demo link first** — `/demo` — with the line *"No sign-in. Click
   Fan out."*
2. The main app link
3. The two-minute video
4. The Wispr usage card screenshot
5. The write-up

Then post with **#NoHandsChallenge**, tagging WeMakeDevs and Wispr Flow, with
your weekly check-in link.

**Submit with hours to spare, not minutes.** Every submission before the
deadline also enters the draw for ten $100 prizes.

## 9. Freeze

**No deploys.** Nothing new.

If something is genuinely broken, fix it and re-run the **full** smoke test.
Otherwise stop. A "small improvement" at hour 46 is how a working entry becomes
a broken link.

---

## Acceptance criteria

- [ ] **Every number** in the write-up, on the landing page and on `/proof`
      traces to real stored data
- [ ] A private-window visitor can open the public link, try the demo, and reach
      `/proof` **without logging in**
- [ ] No secrets, `SPEC.md`, golden set or agent instruction files in anything
      public
- [ ] The video is under two minutes with the Wispr bar visible throughout
- [ ] The usage card is from after the write-up was dictated

## Exit

- [ ] The review prompt scores **≥9 on every criterion**
- [ ] Submitted before Saturday 31 October, 23:59 IST

## Gate

This is the last gate, and it is the real one: a stranger opens your link and
uses your product without asking you anything.

Report: the audit checklist with pass/fail, the final numbers, and the drafts of
the write-up, README and demo script.
