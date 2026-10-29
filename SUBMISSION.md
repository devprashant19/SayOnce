# SayOnce — Submission for "No Hands: The Wispr Challenge"
**By WeMakeDevs and Wispr Flow**

---

## 1. Judge Demo Link (Put this FIRST)
**https://sayonce.vercel.app/demo**
> *No sign-in. Click Fan out.*

---

## 2. Links
- **Dedicated Judge Demo:** https://sayonce.vercel.app/demo
- **Interactive Landing Story:** https://sayonce.vercel.app/
- **Main Speak App:** https://sayonce.vercel.app/app
- **Evidence & Proof Dashboard:** https://sayonce.vercel.app/proof
- **Quality Lab Benchmark Runner:** https://sayonce.vercel.app/lab
- **GitHub Repository:** https://github.com/devprashant19/SayOnce

---

## 3. Official Submission Write-up

### Problem
As an engineering and operations coordinator, I send the same work update to 4–5 people in 3 different languages every day, painstakingly rewriting it for each recipient. A delayed delivery requires a formal English email to the client, a Hindi message in Devanagari script on WhatsApp to the factory vendor, an urgent Hinglish operational task to the warehouse lead, and a row in a project tracking log that nobody ever had time to keep up to date. It took 12 minutes per update, and mistakes were expensive.

### Who it's for
Anyone who coordinates people across languages, roles, and channels — India first, because that is where the linguistic code-mixing is loudest, but ready for global multilingual teams anywhere.

### What it does
I speak one work update in natural, code-mixed Hinglish into an autofocusing text box. SayOnce:
1. Extracts the structured facts with dates normalized to absolute calendar dates and confidentiality bounds tagged.
2. Decides who needs to know, writing a separate message for each person in their native language, script, tone, and channel (`wa.me` for WhatsApp, `mailto:` for email).
3. Enforces an un-bypassable **Privacy Shield**: if I say *"don't tell the client about the vendor delay"*, that fact hits a deterministic shield and never enters the client's draft prompt.
4. Fact-checks every single draft using a pure, deterministic verifier (`lib/checker.ts`, 24 unit tests) that has final authority over the model: 0 invented numbers, 0 invented dates, 0 leaked secrets. If a check fails, the send button is physically disabled.
5. Logs every step to a cryptographic SHA-256 tamper-evident audit trail (`lib/trail.ts`).

### Originality Claim
*No mainstream tool, and no entry I have seen, does this per-person fact partitioning and script-tailored fan-out from a single spoken update.* Most voice tools convert one dictation into one document. SayOnce converts one dictation into multiple completely different, fact-checked communications.

### How I used Wispr Flow
I dictated every prompt, the specification, all 34 golden test cases, and this write-up through Wispr Flow. The product itself is built voice-first around Wispr Flow: holding a hotkey speaks directly into the autofocusing textarea with zero clicks required. Wispr Flow automatically delivers punctuated, code-mixed Hinglish and English. In the app, Command Mode lets me edit drafts by voice ("make Priya's draft firmer", "switch Suresh to Roman script").

### Results & Measured Impact
- **Time saved:** Time per update fell from **12.0 minutes** manually to **~42 seconds** with SayOnce (**94.2% reduction in coordination time**).
- **Voice Amplification:** 62 words spoken expanded into 285 words delivered across 4 recipients in 3 languages (**4.6× output leverage**).
- **Quality & Safety:** 187 automated tests passing across 11 test suites; **0 invented facts**, **100% privacy held**, and **5/5 cryptographic tamper tests passing**.
- **Field Feedback:**
  - *"Didn't expect the supplier notice in clean Devanagari Hindi on WhatsApp — no follow-up questions needed."* — Vendor Operations Partner
  - *"Client schedule update was formal and accurate; no internal packaging re-run details leaked."* — Client Account Manager

---

## 4. Two-Minute Video Script (Wispr Bar Visible)

| Time | Visual / Screen | Spoken Audio (Dictated via Wispr Flow) |
|---|---|---|
| **0:00–0:12** | Real WhatsApp chats and email threads showing the same update written out 4 times in different styles. | *"Every day I send the same update five times, in three languages, rewriting it for each person."* |
| **0:12–0:18** | Quick cut of Wispr Flow bar active while dictating to coding agent. | *"I built SayOnce by talking to it."* |
| **0:18–0:40** | The Speak screen (`/app?demo=1`). Hold Wispr key and speak natural Hinglish: *"Ramesh ne sirf dhai sau cartons bheje... delivery Monday hogi... Priya ko bolo revised schedule hai, don't tell her the vendor shorted us..."* | *(Live spoken update with live waveform; filler words strike through automatically)* |
| **0:40–0:55** | Press Fan out. Cards unfold instantly: formal English email for Priya, WhatsApp in Devanagari Hindi for Ramesh, Hinglish for Suresh. | *"Each person gets only what they need, in their language, tone, and channel."* |
| **0:55–1:05** | Knowledge Matrix view; hover over sentence to see provenance highlight. | *"And I can see exactly who knows what, and trace where every sentence came from."* |
| **1:05–1:18** | Privacy Shield panel; showing blocked fact with red badge and zero leaks in client draft. | *"I said don't tell the client it was the vendor shortfall. SayOnce's deterministic verifier physically blocks that leak."* |
| **1:18–1:28** | Command bar (⌘K) voice action, tap 'Send via WhatsApp' to open `wa.me` with Devanagari text prefilled. | *"I edit by voice and send in one tap. Official wa.me and mailto links, no fragile bots."* |
| **1:28–1:38** | Click 'Verify trail' — turns green showing SHA-256 hash chaining intact. | *"Every step is logged cryptographically. The audit trail nobody used to keep now writes itself."* |
| **1:38–1:50** | Show `/proof` dashboard showing 94% time savings and 4.6× Voice Amplification. | *"I spoke 62 words. It delivered 285 words to four people in three languages. About 11 minutes saved."* |
| **1:50–1:57** | Switch dataset to Global Team — Spanish, Portuguese, Taglish. | *"Built for how India works. Ready for anywhere people coordinate across languages."* |
| **1:57–2:00** | Final call to action card with link: `sayonce.vercel.app/demo`. | *"SayOnce. Say it once. Everyone gets their version."* |

---

## 5. Social Post Template (X / LinkedIn)

> Ever spend 15 minutes rewriting the same work update for your boss in English, your vendor in Hindi, and your team on WhatsApp?
>
> I built **SayOnce** (Ek Baar Bolo) for "No Hands: The Wispr Challenge" by @WeMakeDevs and @FlowWispr.
>
> 🎙️ Speak one Hinglish update
> 🛡️ 100% Privacy Shield: blocks secret leaks before drafting
> ✍️ Each person gets their own draft in their native language, script, and channel (wa.me & mailto)
> 🔍 Deterministic fact-checking (0 hallucinations guaranteed)
> 🔗 Cryptographic SHA-256 audit trail
> 
> ⚡ Try the live demo (no login needed): https://sayonce.vercel.app/demo
> 📊 Real numbers & proof: https://sayonce.vercel.app/proof
>
> #NoHandsChallenge #WisprFlow #BuildWithAI

