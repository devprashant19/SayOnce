# The challenge and how it is judged

## Facts that shape every decision

| Item | Detail |
| --- | --- |
| Challenge | No Hands: The Wispr Challenge, by WeMakeDevs and Wispr Flow |
| Runs | 16 to 31 October 2026 |
| Deadline | **Saturday 31 October, 23:59 IST** |
| Entry | Solo. One project per person. |
| Tracks | **Builders** (you write code / dictate into coding tools) and **No-Code** (built with an AI app builder, no coding) |
| What counts | Something judges can open and use: an app, a shared assistant or a workflow. A chat thread or a one-off prompt does not count. |
| Access | A public link, no payment. If sign-in were needed you would have to supply a test login — so there is no sign-in. |
| Submission | Project link, demo video up to 2 minutes, Wispr usage card screenshot from Insights, a few lines on the problem, the user and how Wispr was used |
| Voice rule | Voice for prompts, docs and messages; keyboard only for shortcuts and small fixes. Judges look at how much writing went through Flow. |
| Prizes | ₹1,00,000 per track winner; ₹50,000 for rank 1 on the Wispr usage leaderboard and ₹50,000 drawn at random from it; ten projects drawn at random win $100 each |
| Results | Scores published Wed 4 Nov; questions until Thu 5 Nov; winners Fri 6 Nov |

## Which track

SayOnce as built here — a Next.js app, dictated into a coding agent — is a
**Builders** entry. The track description is explicit: Builders is for
dictating requirements into coding tools and letting them write the code.

The No-Code track is for tools made with an AI app builder with no coding. If
you would rather enter that track, the product design does not change; the
build route does, and the phases still apply. Confirm with the organisers if
your route is ambiguous.

## The four criteria

Every decision in this repo is made to give one of these visible proof.

### 1. Does it solve a real problem in your work?

What they look for: a specific problem, a clear user, and a tool that person
would keep using.

How SayOnce shows it: your own People Book, your real projects, two days of
real use. Hard numbers — updates sent, messages generated, minutes per update
before and after. This is the criterion that cannot be faked and the one most
entries will be weakest on.

**This is why Phase 0 is not optional.** A golden set built from your real
updates is the evidence; a demo with invented contacts only is the single
fastest way to lose this criterion.

### 2. Was Wispr used meaningfully?

What they look for: Flow is part of the build *and* the workflow, shown in the
demo and the usage card.

How SayOnce shows it: Wispr is the input device of the product itself —
Hinglish dictation in, Command Mode for edits, dictated feedback that teaches
the app, the Wispr Dictionary keeping contact names spelled right. And the
build was dictated, which the usage card proves.

See [09-WISPR-INTEGRATION.md](09-WISPR-INTEGRATION.md).

### 3. Does it work?

What they look for: a live link they can open and use.

How SayOnce shows it: a public link, no sign-in, and a Judge Demo button that
loads sample contacts so a judge can complete a fan-out in under a minute —
with cached results, so the guided path never waits on or fails at an AI call.

See [10-JUDGE-DEMO.md](10-JUDGE-DEMO.md).

### 4. Is the demo clear?

What they look for: a two-minute video anyone can follow.

How SayOnce shows it: one messy spoken update becomes five tailored messages on
screen, then one tap opens WhatsApp. The before and after needs no explanation.

See [15-DEMO-SCRIPT-AND-SUBMISSION.md](15-DEMO-SCRIPT-AND-SUBMISSION.md).

Every project is scored by several judges, scores are averaged, and **every
score and comment is public**.

## The judges, and what each one is likely to notice

| Judge | Role | What lands with them |
| --- | --- | --- |
| Kunal Kushwaha | Founder, WeMakeDevs | Runs a community and events business that sends the same announcement to sponsors, speakers, volunteers and attendees. He will recognise the problem from his own week. |
| Rohan Kochhar | India Growth, Wispr Flow | The tool shows Indian professionals why to talk instead of type, in their own language mix. That is his growth story in one demo. |
| Aayush Sharma | COO, WeMakeDevs | Operations. Will look for whether this would actually survive a real week. |
| Sachin Sharma | CMO, WeMakeDevs | Will look for whether the one-line pitch survives contact with a stranger. |

All four: it has to be explainable in one sentence, and the WhatsApp tap is the
memorable moment in a two-minute video.

## The bar

The sample submission is a sales rep's follow-up writer, built in Lovable by
voice, **tested on notes from 14 real calls**, cutting follow-up time to under
a minute.

Expect to be compared against that level of evidence. Thirty golden cases and
two days of real use clears it. A polished demo with no numbers does not.

## The competitive landscape

| Pattern | Examples | Why SayOnce differs |
| --- | --- | --- |
| One dictation → one document | PRD writer, follow-up writer, investor update writer | SayOnce writes a different message per reader, with different *content*, not just different wording |
| Translation | Command Mode "translate to", translation apps | Translation keeps the same content. SayOnce decides what each person needs to know. |
| Multi-language automation | Spoki-style flows | Those send templated messages. SayOnce starts from your own speech. |

Official example ideas judges have already seen: campaign brief generator, PRD
writer from call notes, sales follow-up writer, investor update writer, design
feedback collector, onboarding planner, content calendar, competitor tracker,
release notes, lead tracker, proposal builder, hiring pipeline, JD writer,
interview feedback collector. Every one of them is one-dictation-one-document.

Entries already visible in the daily draw: OfferClara (job offer red-flag
checker), Clementine (offline file converter), Cloak (developer workbench),
SayPDF (a PDF editor you talk to), SpecFlow (voice-first engineering planning).
Mostly Builders-track tools, none doing per-person fan-out.

Nobody can guarantee an idea was never built. The honest claim for the
write-up: **no mainstream tool, and no entry visible so far, does this
per-person fan-out from a single spoken update.** Say that, not "the first ever".

## What would lose points, and the countermeasure

| Risk | Countermeasure |
| --- | --- |
| A demo with made-up contacts only | Show your real use, numbers blurred. Phase 8. |
| A typed demo | Every input on screen visibly dictated, Wispr bar showing. Turn the bar on under Settings → System; it is hidden by default on new installs. |
| A login wall | There is no login anywhere. Phase D. |
| The AI invents a fact on camera | The deterministic checker holds back any draft it cannot account for, and the original update stays on screen above the cards. |
| "Where are the numbers?" | `/proof`, linked from the footer, every figure traceable to stored data. |
| Weak Hindi or regional output | A language field per contact, and a native speaker reads five drafts per language before recording. |
| Low Wispr usage on the card | Dictate everything: prompts, the golden set, SPEC.md, posts, the README, the write-up. |

## Checklist before submitting

- [ ] Wispr Flow installed with the challenge promo; Hinglish (or your languages) selected
- [ ] Registered on the challenge site with the same email as Wispr
- [ ] App on a public link, working in a private window and on a phone, no login
- [ ] Judge demo link first in the submission, with the line "No sign-in. Click Fan out."
- [ ] Two days of real use, with numbers recorded
- [ ] Quality Lab latest run meets every target
- [ ] Progress posted with #NoHandsChallenge, tagging WeMakeDevs and Wispr Flow
- [ ] Two-minute video recorded, Wispr bar visible throughout
- [ ] Usage card screenshot from Insights
- [ ] Write-up dictated and submitted before Sat 31 Oct, 23:59 IST
