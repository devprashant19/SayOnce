# The demo video and the submission

## The two-minute video

Up to two minutes. Keep the **Wispr Flow Bar visible the whole time** — it is
the evidence that the input was spoken, and it is hidden by default on new
installs (Settings → System).

| Time | On screen | You say |
| --- | --- | --- |
| 0:00–0:12 | Your real WhatsApp and email, the same update written out four or five times | "Every day I send the same update five times, in three languages." |
| 0:12–0:18 | Two-second cuts of you dictating to your build agent | "I built this by talking to it." |
| 0:18–0:40 | The Speak screen. Hold the Wispr key, talk natural Hinglish — a real update, a delayed delivery and the new plan | *(the update itself; let the words land, do not narrate over them)* |
| 0:40–0:55 | Suggested recipients with reasons, then the cards fan out: formal English email, Hindi WhatsApp in Devanagari, short Hinglish vendor note | "Each person gets only what they need, in their language." |
| 0:55–1:05 | The Knowledge Matrix, then hover a sentence so the spoken words light up | "And I can see exactly who was told what, and where every sentence came from." |
| 1:05–1:18 | The blocked draft — the Privacy Shield, with the leaking phrase struck through | "I said don't tell the client it was the vendor. It won't let me." |
| 1:18–1:28 | Command Mode on one draft ("make this firmer"), then tap Open in WhatsApp and it opens with the message ready | "I edit by voice and send in one tap." |
| 1:28–1:38 | Verify trail turning green; the Update Log filling itself | "Every step is logged, and the record nobody used to keep now writes itself." |
| 1:38–1:50 | The Voice Return meter, then your `/proof` numbers from two days of real use | "I spoke 84 words. It delivered 412, to five people, in three languages." |
| 1:50–1:57 | The global demo contacts — Spanish, Portuguese, Taglish | "Built for how India works. Ready for anywhere people work in more than one language." |
| 1:57–2:00 | The app link | Name and link |

### Rules for the recording

- **Every input visibly dictated.** A typed demo loses criterion 2 outright.
- **Real contacts, numbers blurred.** Made-up contacts only is the fastest way
  to lose criterion 1.
- **One take per segment, then cut.** Do not try to do it live in one pass; the
  one thing that always goes wrong is the one you are on camera for.
- **Record the fan-out on a warm cache** so there is no twelve-second spinner.
- **Show the phone** for the WhatsApp tap if you can. It is the most convincing
  three seconds in the video.
- **Do not narrate the UI.** "Now I click here" wastes the only two minutes you
  get. Say what it means, not what it does.

### If the recording has to be shorter

Cut in this order: 0:12–0:18 (the build clips), 1:28–1:38 (trail and log),
1:50–1:57 (global). Never cut 0:18–0:55 — the spoken update and the fan-out are
the entire product.

## The write-up

A few lines on the problem, who it is for, and how you used Wispr. Dictate it,
then fill in your real numbers.

> **Problem.** As a [your role], I send the same update to [N] people in
> [languages] every day, rewriting it for each one. It took me about [X]
> minutes per update, and the tracker almost never got filled in.
>
> **Who it's for.** Anyone who coordinates people across languages and
> channels, starting with me and my team.
>
> **What it does.** I speak one update in Hinglish. SayOnce works out who needs
> to know, writes each person their own message in their language, tone and
> channel, checks every draft against what I actually said — a plain function,
> not the AI's own say-so — and lets me send each one in a tap. Then it logs
> the update.
>
> **How I used Wispr.** I dictated every prompt, the spec, all 34 test cases
> and this write-up through Flow. The product itself runs on Wispr: the input
> is my spoken Hinglish, and I edit drafts with Command Mode. Usage card:
> [words] words.
>
> **Result.** In 2 days I sent [N] updates and [M] messages through SayOnce.
> Time per update fell from about [X] minutes to about [Y] minutes. The Quality
> Lab runs 34 recorded cases against the live pipeline: zero invented facts,
> 100% on privacy, [Z]% must-know coverage.

### On the originality claim

Say: *"No mainstream tool, and no entry I have seen, does this per-person
fan-out from a single spoken update."*

Do **not** say "the first ever" or "nothing like it exists". Nobody can verify
that, and a judge who finds one counter-example discounts everything else you
claimed.

## What to submit

In this order:

1. **The judge demo link first** — `/demo` — with the line: *"No sign-in. Click
   Fan out."*
2. The main app link
3. The two-minute video
4. The Wispr usage card screenshot from **Insights** in the desktop app
5. The write-up above

Submissions close **Saturday 31 October, 23:59 IST**. Submit with hours to
spare, not minutes — and remember that every submission before the deadline is
also entered into the draw for ten $100 prizes.

## The README

Public, so it must carry no secrets and no golden set. Keep it short:

- what SayOnce is, in two sentences
- how to run it locally (`.env.example` → `.env.local`, `npm install`, `npm run dev`)
- how accuracy is checked, and a link to the latest lab numbers
- what is deliberately out of scope
- the challenge credit

## Before you hit submit

- [ ] The judge demo link works in a private window, on a phone, with no login
- [ ] Every number in the write-up, on the landing page and on `/proof` traces
      to stored data
- [ ] The video has the Wispr bar visible throughout
- [ ] The usage card screenshot is from after you dictated the write-up
- [ ] `npm run audit:secrets` is clean against the production build
- [ ] The Open Graph preview looks right pasted into WhatsApp
- [ ] You have posted progress with #NoHandsChallenge, tagging WeMakeDevs and
      Wispr Flow, with your weekly check-in link
- [ ] No deploys since the last full smoke test
