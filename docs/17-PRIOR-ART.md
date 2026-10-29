# Prior art

No repository does SayOnce end to end. But five patterns are proven and worth
copying **by description** — tell the build agent the pattern; there is no need
to read anyone's code.

## Patterns to borrow

| Project | What it does | The pattern to take |
| --- | --- | --- |
| **llm-release-action** | Writes separate changelogs per audience (developer, customer, executive) and per language from one set of commits | **Two-stage pipeline: extract structured facts first, then generate one version per audience in parallel, with per-audience filters and tone.** This is SayOnce's core architecture, already implemented as Extract → Compose. |
| **InsightPulse** | Writes stakeholder emails with an LLM from work-tool data | **Output scrubbing** — scan generated text for secrets and personal data before showing or saving it. Implemented as `lib/scrub.ts`. |
| **GitTalker** | An agent that sends project updates to stakeholders in Slack | **Stakeholders as first-class records**, plus a timestamped update history. Implemented as the `contacts` table and the Update Log. |
| **Langflow Personalized Outreach** | Generates a tailored message per prospect from their context and goals | **Per-person context drives content** — a "cares about" profile decides what each message includes. Implemented as `contacts.cares_about`, read by Compose as a priority instruction. |
| **OpenTypeless** | Open-source Wispr-style dictation with app-aware rewriting | **Channel-aware style** — the same words get a different structure for email than for chat. Implemented as the channel rules in the Compose prompt and `CHANNEL_LIMITS`. |
| **Personalized Message Generator** | Template with variables, live preview, copy | **Copy-first card UX.** Every card has a Copy button that always works, even when sending is blocked. |

## One warning to heed

**`whatsapp_voice_transcription`** turns voice notes into text via WhatsApp —
using an **unofficial WhatsApp library that can get accounts restricted**.

SayOnce uses `wa.me` links instead. They are official, free, need no account,
and cannot get a number banned. Do not swap them for a library however
convenient the automation looks; it would risk the one channel the product
depends on.

The same logic applies to the unofficial **Wispr Flow SDK**: it works by
reverse-engineering and patching the desktop app. SayOnce does not need it,
because Wispr types into any text box.

## Datasets for test inputs

Two, both useful for making the golden set realistic rather than tidy:

**HinGE** — human-written Hinglish sentences with parallel Hindi and English.
Borrow a few sentence *styles* to make your test updates sound like speech
rather than like written prose.

**COMI-LINGUA** — the largest annotated Hinglish dataset. Its paper lists the
typical model mistakes on Hinglish, and those are exactly what the
`hinglish-edge` golden group should be built to catch:

- English words written in Devanagari script
- numerals spoken in Hindi ("dhai sau", "do hazaar")
- relative dates ("parso", "kal", "agle hafte")
- mixed honorifics

Borrow styles and failure modes. Do not borrow sentences wholesale — the golden
set has to be *your* updates for criterion 1 to hold.

## Why the architecture looks the way it does

The two-stage pattern from llm-release-action is doing most of the work, and it
is worth being explicit about why, because it is tempting to collapse it.

A single call that reads the spoken text and writes five messages would be
shorter and cheaper. It would also:

- give the model no place to record *which* facts it used, so provenance would
  be unverifiable
- give no mechanism to withhold a fact from one reader, since one call sees
  everything — the Privacy Shield would become an instruction rather than a
  guarantee
- make the deterministic checker impossible, because there would be no
  structured fact list to check against

Extract-then-compose is what turns "the AI was careful" into "a plain function
confirmed it". Every accuracy claim in this entry rests on that separation.
