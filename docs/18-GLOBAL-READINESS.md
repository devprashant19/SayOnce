# Global readiness

Build one region-neutral product and treat India as the first launch market.
Nothing in the core is India-specific: **language, channel, tone and honorifics
are per-contact settings, not features.**

This is not a stretch goal. It is a ten-second closing line in the demo that
makes the product sound bigger without costing a single extra hour — and it
only works because the data model was built this way from the start.

## The same problem, everywhere

| Region | Typical language mix | Main channel | Example user |
| --- | --- | --- | --- |
| India | Hinglish, Hindi, Tamil, Marathi, English | WhatsApp, email | Ops coordinator updating a manager, vendors and field staff |
| Latin America | Spanish, Portuguese, Spanglish, English | WhatsApp | Agency account manager updating clients and freelancers |
| Southeast Asia | Bahasa, Tagalog, Taglish, English | WhatsApp, Telegram, LINE | Small manufacturer updating buyers and suppliers |
| Africa | English, Swahili, Hausa, French, Pidgin | WhatsApp | NGO project lead updating donors and field teams |
| Europe and Gulf | English with Arabic, German, French | Email, Slack, Teams | Manager in a multinational team |

## The five decisions that make it global at no extra cost

**1. No hard-coded languages.** `contacts.language` is free text. The model
writes in whatever is entered: "Brazilian Portuguese, informal", "Hindi,
Devanagari", "Taglish, Roman script". An enum here would have been the single
decision that locked the product to one country.

**2. Channels as a list.** WhatsApp, email and copy to start. Telegram (`t.me`
share links), SMS and Slack are one extra button each, later. Nothing in the
pipeline knows which channels exist — Compose reads `channel` from the profile
and applies that channel's rules.

**3. Phone numbers in E.164.** Stored with the country code and a leading `+`,
validated by the schema. `wa.me` links then work in every country without a
special case. The demo sets include `+91`, `+52`, `+55` and `+63` numbers for
exactly this reason, and the link tests cover three countries.

**4. Formality as a per-contact setting.** `casual` / `neutral` / `formal`,
rather than assuming Indian norms. The model applies the right honorifics for
*that* language — "ji" and "sir" in Hindi, "usted" in Spanish, nothing at all
in casual Taglish. Hard-coding Indian politeness would have made every
non-Indian draft subtly wrong.

**5. Script detection by Unicode range.** `lib/script.ts` reads what script a
language label asks for and what script the draft is actually in. It covers
Devanagari, Latin, Arabic, Cyrillic and CJK — and deliberately returns *no
requirement* for a language it does not recognise, rather than a false failure.

## The two demo datasets

Both ship in `data/demo/`, and the judge demo lets a judge switch between them:

| Set | Contacts | Languages |
| --- | --- | --- |
| **Indian team** | Operations head, packaging vendor, warehouse lead, client PM, ops coordinator | English, Hinglish, Hindi in Devanagari |
| **Global team** | Regional director (Lagos-style), supplier AM (Mexico City), factory manager (São Paulo), buyer, logistics coordinator (Manila) | English, Mexican Spanish, Brazilian Portuguese, Taglish |

A judge seeing the second set in two clicks is the entire proof that this is
not one country's tool. One of the five `global` golden cases produces Spanish,
Portuguese and Taglish from a single English update — that case is the claim,
made checkable.

## How to pitch it

> "Built for how India works, ready for how the world works. Over half of all
> Wispr dictations are in languages other than English, and most people who
> coordinate work rewrite the same update for different people every day."

## Keep India first in the demo

These judges are Indian, and one of them is Wispr's India growth lead. The
global part works best as a **ten-second closing line**, not the main story.

The video spends 0:18–1:38 on a real Hinglish update to a real Indian team, and
1:50–1:57 showing the global contacts. That ratio is deliberate: the Indian
case is where the judge recognises their own week, and recognition is what wins
criterion 1.

## What would break the global claim

Three things to watch for during the build, because each one would be an easy
mistake:

- **Translating instead of composing.** If a draft reads like a translation of
  the English version rather than something written for that reader, the
  product has quietly become a translator. The `cares_about` filtering is what
  prevents it.
- **An enum creeping into `language`.** The moment it becomes a dropdown of
  five options, the product is region-locked.
- **Indian honorifics leaking into non-Indian drafts.** A Spanish message that
  says "ji" is the kind of detail a judge notices and remembers.
