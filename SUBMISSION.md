# SayOnce — Submission for "No Hands: The Wispr Challenge"

**By WeMakeDevs and Wispr Flow**

> **Status: partially submittable.** The app is deployed and live. Real-use
> numbers have not yet been measured. Nothing in this file states a figure that
> has not been verified — §6 lists exactly what is missing.

---

## 1. Judge demo link — put this first

**https://say-once-kappa.vercel.app/demo**

> *No sign-in. Click Fan out.*

## 2. Links

| What | URL |
| --- | --- |
| Judge demo | https://say-once-kappa.vercel.app/demo |
| Landing story | https://say-once-kappa.vercel.app/ |
| Speak app | https://say-once-kappa.vercel.app/app |
| Evidence dashboard | https://say-once-kappa.vercel.app/proof |
| Quality Lab | https://say-once-kappa.vercel.app/lab |
| Repository | https://github.com/devprashant19/SayOnce |

---

## 3. Submission write-up

### Problem

I take on client web projects as a freelance full-stack developer. On any
project I am the only person who knows everything, and four or five other
people each need a different slice of it.

A bug found, an endpoint renamed, a scope change, a build ready to test — each
one means telling several people separately, in different languages, leaving
out different things. The client gets formal English and must never hear which
subcontractor caused a delay. The designer gets three lines of Hinglish on
WhatsApp. The backend contractor prefers Hindi in Devanagari and wants the
exact payload shape. The tester wants the build number and what is knowingly
broken. The agency PM wants the milestone date and the invoice timing.

So I write the same facts four times, the one I skip is always the one that
mattered, and the project tracker I promised to keep never gets filled in.

### Who it is for

Anyone who coordinates people across languages, roles and channels. India
first, because that is where the code-mixing is loudest — but language, script,
channel and formality are per-contact fields rather than product features, so
the same app works for a team split across São Paulo, Lagos or Manila.

### What it does

I speak one update in natural code-mixed Hinglish into an autofocusing text
box. SayOnce then:

1. **Extracts** structured facts — resolving relative dates ("parso", "kal",
   "next Monday") to absolute ones, converting numerals spoken in Hindi
   ("dhai sau" → 250), applying mid-sentence corrections, and tagging anything
   I said must be withheld.
2. **Routes** — decides who needs to know and which facts each of them needs,
   with a one-line reason I can check in two seconds.
3. **Composes** one message per person, in their language and script, at their
   formality, sized for their channel.
4. **Enforces the Privacy Shield.** When I say *"don't tell the client it was
   the contractor"*, that fact never enters the client's Compose prompt at all.
   The guarantee is what the model is *handed*, not what it is asked to
   remember.
5. **Verifies** every draft with a deterministic checker — `lib/checker.ts`,
   **24 unit tests**, no model in it — which has final authority over the AI. A
   draft it fails has its send button disabled until I edit or explicitly
   override, and the override is logged.
6. **Logs** every step to a hash-chained, tamper-evident audit trail
   (`lib/trail.ts`), with a button that recomputes the chain.

Sending is via official `wa.me` and `mailto:` links — no messaging API, no
account, and nothing that can get a WhatsApp number restricted.

### Originality claim

*No mainstream tool, and no entry I have seen, does this per-person fact
partitioning and script-tailored fan-out from a single spoken update.* Most
voice tools turn one dictation into one document. SayOnce turns one dictation
into several genuinely different, fact-checked messages.

### How I used Wispr Flow

I dictated the prompts, the specification, the golden test cases and this
write-up through Flow. The product itself is voice-first around it: holding the
hotkey types straight into an autofocusing textarea with no click, and Flow
delivers punctuated, code-mixed Hinglish. In the app, Command Mode edits drafts
by voice, and dictated feedback under a card updates that contact's profile for
next time.

Deliberately **no unofficial Wispr SDK**: Flow types into any text box, so a
well-behaved textarea is the entire integration — nothing to break, nothing
against anyone's terms.

### Verified engineering results

Every figure below was produced by a command in this repo and can be
reproduced:

| Claim | How to verify |
| --- | --- |
| **207 automated tests passing** across 14 suites | `npm run test` |
| **24 tests** on the deterministic checker | `npx vitest run tests/checker.test.ts` |
| **5 / 5 cryptographic tamper tests passing** — a payload edit, a deleted row, an inserted row and a re-signed predecessor, each caught at the exact row | `npm run test:tamper` |
| **0 keys, 0 phone numbers, 0 email addresses** in the client bundle | `npm run audit:secrets` |
| Typecheck, lint and production build clean | `npm run verify:all` |

### Real-use results

```
TODO. Not yet measured.
```

`/proof` reads these from stored data and currently shows "Not yet measured"
for each, which is deliberate — see §6.

---

## 4. Two-minute video script

Record with the **Wispr Flow Bar visible throughout** (Settings → System; it is
hidden by default on new installs).

| Time | On screen | You say |
| --- | --- | --- |
| 0:00–0:12 | Your real WhatsApp and email, the same update written out four times | "Every day I send the same update four times, in three languages." |
| 0:12–0:18 | Two-second cuts of you dictating to the build agent | "I built this by talking to it." |
| 0:18–0:40 | The Speak screen. Hold the Wispr key, speak a real Hinglish update | *(the update itself — let it land, don't narrate over it)* |
| 0:40–0:55 | Fan out. Cards unfold: formal English email, Devanagari WhatsApp, short Hinglish note | "Each person gets only what they need, in their language." |
| 0:55–1:05 | Knowledge Matrix, then hover a sentence so the spoken words light up | "I can see who was told what, and where every sentence came from." |
| 1:05–1:18 | The blocked draft — Privacy Shield, leaking phrase struck through | "I said don't tell the client it was the contractor. It won't let me." |
| 1:18–1:28 | Command bar (⌘K), then tap Open in WhatsApp — it opens with Devanagari prefilled | "I edit by voice and send in one tap." |
| 1:28–1:40 | Verify trail turning green; the Update Log filling itself | "Every step is logged, and the record nobody kept now writes itself." |
| 1:40–1:52 | `/proof` — the Quality Lab table | "A plain function, not the AI, checks every draft against what I said." |
| 1:52–1:57 | Switch to the Global team — Spanish, Portuguese, Taglish | "Built for how India works. Ready for anywhere people work in more than one language." |
| 1:57–2:00 | The app link | Name and link |

**Only show `/proof` figures that are actually measured by then.** If the
real-use numbers are still empty at recording time, show the Quality Lab table
instead — it is the stronger shot anyway, because every number in it is
reproducible on camera.

---

## 5. Social post

> I built **SayOnce** for #NoHandsChallenge — entirely by voice.
>
> I speak one work update in Hinglish. It works out who needs to know, writes
> each person their own message in their language and channel, and a plain
> function — not the AI — checks every draft against what I actually said.
> Anything it can't account for is held back and shown to me.
>
> 🎙️ One Hinglish update in
> 🛡️ Withheld facts never enter the other person's prompt
> ✍️ A different message per reader: language, script, tone, channel
> 🔍 A deterministic checker with final authority over the model
> 🔗 Hash-chained audit trail you can verify
>
> Say it once. Everyone gets their version.
>
> @WeMakeDevs @WisprFlow #NoHandsChallenge #WisprFlow

---

## 6. What is still outstanding

Fix these before submitting. Nothing else in this file is blocked on them.

| # | Item | Why it matters | How |
| --- | --- | --- | --- |
| 1 | **No baseline measured.** `SAYONCE_BASELINE_MINUTES` is unset. | A time saving cannot be computed without it, and it can only be measured **before** the tool is in use. | Time five updates written the old way; put the average in `.env.local` |
| 2 | **No real use.** The real dataset is empty. | Criterion 1 is "a real problem in your own work". | Use it for your actual updates; the app measures elapsed time itself |
| 3 | **Golden set is 20 cases**, built from a drafted spec. | The 10 `real` cases should be your own dictated updates. | Dictate over `p_real_01`–`08` in `data/golden/golden-set.draft.json` |

### Removed from an earlier draft of this file

Recorded here because it matters that the submission is clean:

- A time saving of "94.2%", a baseline of "12.0 minutes", an after figure of
  "~42 seconds" and "4.6× amplification" — **none of these were measured.**
  They were hardcoded into `/proof` as static markup and captioned as measured.
- Two quoted testimonials attributed to a "Vendor Operations Partner" and a
  "Client Account Manager" — **those people do not exist.**
- "All 34 golden test cases" — there are 20.
- A problem statement describing an operations coordinator at a warehouse,
  which is not my work.

`/proof` now reads from stored data and shows "Not yet measured" where nothing
has been. A judge asking "how did you measure that?" has to get an answer, and
an honest gap beside a reproducible Quality Lab score is a stronger position
than a confident number with nothing behind it.
