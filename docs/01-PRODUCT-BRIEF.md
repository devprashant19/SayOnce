# Product brief

## One line

Say it once, and everyone who needs to know gets their own version.

India launch name: **Ek Baar Bolo**.

## The problem

Anyone who coordinates people rewrites the same facts many times a day.

One delayed shipment becomes a formal English email to the manager, a short
Hinglish WhatsApp to the vendor, a Hindi message to the warehouse lead, a line
for the team, a careful note to the client that leaves out whose fault it was,
and a row in a tracker that never gets filled.

The facts are identical. What changes is the language, the tone, the level of
detail, and — this is the part every other tool misses — **which facts each
person gets at all**.

## The user

You first. Someone with five to ten regular contacts across at least two
languages or channels: operations, project coordination, sales, HR, a founder, a
school admin, an event organiser.

Then anyone, anywhere, who coordinates people across languages and channels.
See [18-GLOBAL-READINESS.md](18-GLOBAL-READINESS.md).

## Why this shape wins

| | |
| --- | --- |
| **A different shape** | Every official example idea, and most entries, take one dictation and produce one document. SayOnce takes one dictation and produces many messages, each with different content. |
| **Wispr is load-bearing** | The input is code-mixed speech — exactly what Wispr's Hinglish model exists for. Typing the same update five times is the pain it removes. Remove Wispr and the product does not work. |
| **A measurable result** | Two days of real use, with minutes per update before and after, and the message count. |
| **Region-neutral by construction** | Language, channel, tone and honorifics are per-contact fields, not features of one country. The same app works in São Paulo, Lagos or Jakarta. |

## How it works

1. **People Book.** Add each regular contact once: name, role, relationship,
   language (free text), channel, formality, what they care about, and anything
   they must never be told.
2. **Speak.** Hold the Wispr key and talk for 30 to 90 seconds, in any mix.
3. **Who needs this?** The app suggests which contacts are affected, with a
   one-line reason each and a confidence. You tick or untick.
4. **Fan out.** One message per ticked person, with only what that person needs,
   in their language, tone and length.
5. **Check.** A plain function re-reads every draft against the facts you spoke.
   Anything it cannot account for is held back and shown struck through.
6. **Adjust by voice.** Edit any draft with Wispr Command Mode, or dictate
   feedback that updates that contact's profile for next time.
7. **Send.** WhatsApp opens on the right chat with the text filled in. Email
   opens with subject and body. Copy always works. No paid APIs.
8. **Log.** The update is saved with its facts, decisions and who was told —
   the record the team never used to keep.

## Screens

| Screen | Route | Purpose | Key elements |
| --- | --- | --- | --- |
| Landing | `/` | The story in 30 seconds of scroll | Six scenes, one signature moment, transition into the app |
| Speak | `/app` | The main screen | Large autofocused textarea, project picker, contacts picker, Fan out |
| Results | `/app` | Review and send | Suggested recipients with reasons; one card per person with language badge, channel icon, editable draft, Copy, Open in WhatsApp/Email |
| People Book | `/people` | Contact profiles | All fields; dictate a whole contact into one box |
| Update Log | `/log` | History | Date, project, summary, decisions, who was told; filters; CSV export |
| Quality Lab | `/lab` | The accuracy screen | Golden set run, a row per metric, pass/fail per case, run history |
| Proof | `/proof` | Real-use evidence | Updates, messages, languages, minutes before and after, anonymised |
| Judge demo | `/app?demo=1` | For judges | Pre-filled sample, dataset picker, five-step tour, Reset demo |

## The runtime pipeline

```
Extract  →  Route  →  Compose  →  Verify  →  Send & Log
   │          │          │           │
   │          │          │           └─ deterministic checker has final authority;
   │          │          │              AI layer catches what arithmetic cannot
   │          │          └─ once per selected contact, in parallel, given ONLY
   │          │             that contact's allowed facts
   │          └─ decides who, and which facts each one gets
   └─ the only step that reads the speaker's words
```

The Verify stage is the accuracy differentiator: nothing reaches a send button
until it matches the extracted facts.

## Data model

Six tables. Full field list in [04-DATA-MODEL.md](04-DATA-MODEL.md).

`contacts`, `updates`, `facts`, `messages`, `trail_entries`, `lab_runs`
(plus `demo_usage` for the judge-demo caps).

## The seven standout features

Each turns an invisible AI step into something a judge can see and click.
Details and acceptance criteria in [06-STANDOUT-FEATURES.md](06-STANDOUT-FEATURES.md).

| Feature | Phase |
| --- | --- |
| Knowledge Matrix — facts by people, including who was deliberately not told | 2 |
| Fact provenance — hover a sentence, the spoken words light up | 4 |
| Privacy Shield — a spoken instruction becomes a hard lock | 4 |
| Trust Trail — hash-chained audit log with a Verify button | 4 |
| Quality Lab — the golden set run, visibly, in the app | 4 |
| Consistency Guard — "last Tuesday you told him Friday; this says Monday" | 5 |
| Voice Return meter — words spoken vs words delivered vs minutes saved | 5 |

## Out of scope

Deliberately, so the two days hold:

- Sending through any messaging API. wa.me and mailto only.
- Any login, account or payment.
- Any unofficial Wispr SDK. Wispr types into a text box; that is the integration.
- Real-time collaboration, teams, multi-user anything.
- Channels beyond WhatsApp, email and copy. Telegram and Slack are one extra
  button each, later.
- Mobile apps. The web app is mobile-first and that is enough.

## Backups

If your own work genuinely does not involve updating several people, the
problem will look invented and criterion 1 collapses. Two alternatives with the
same voice-first shape are in [16-RISKS-AND-FALLBACKS.md](16-RISKS-AND-FALLBACKS.md).
