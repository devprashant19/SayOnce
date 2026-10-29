# Wispr integration

Judges score whether Flow is part of **the build** and **the workflow**. Show
both. The two halves are scored separately and evidenced differently.

## The integration is a text box

Wispr Flow types into whatever text box has the cursor. That is the whole
integration.

**Do not use any unofficial Wispr SDK.** The one that exists works by
reverse-engineering and patching the desktop app. It could break at any time
and could breach terms — and SayOnce does not need it. A well-designed text box
is a complete, robust, terms-compliant integration.

What "well-designed" means is in [08-UI-UX-RULES.md](08-UI-UX-RULES.md) under
"the speak box", and implemented in `components/SpeakBox.tsx`. The short
version: autofocus, large, grows, accepts paste, and **never fights the cursor**.

## Inside the product — what the judge sees in the demo

| Moment in SayOnce | Wispr feature | Why it matters |
| --- | --- | --- |
| Speaking the update | Push-to-talk or hands-free, Hinglish model | The core input is code-mixed speech — the thing Wispr is built for |
| Adding a contact | Dictation into one box; the AI fills the form | No form-filling by keyboard anywhere in the app |
| Fixing a draft | **Command Mode**: highlight the text, say "make this firmer" | Editing by voice, visibly, on screen |
| Teaching the app | Dictated feedback under each card | The app learns from your voice and the change sticks |
| Names spelled right | **Wispr Dictionary** with contact and project names | Fewer transcription errors, so fewer wrong names in messages |
| Repeated phrases | **Wispr Snippets** — a trigger that expands to your project codes or sign-off | Shows a Pro feature doing real work |
| Hands-free send | Ctrl/Cmd+Enter fans out | Speak the update and send it without touching the mouse |

Two of these are worth planning the demo around: **Command Mode on a draft**
(1:05 in the script) and **dictated feedback that changes a contact's profile**
(the thing that makes it feel alive).

## Setup, before anything else — Phase 0

- [ ] Install Wispr Flow with the challenge promo (the month of Pro is included)
- [ ] Select English **plus Hinglish** (or your languages) in the language settings
- [ ] Add every contact name, project code and product name to the **Wispr
      Dictionary**, so they are spelled right in every draft. A misspelled
      vendor name in a message is a visible failure that has nothing to do with
      the pipeline.
- [ ] Turn on **Command Mode**
- [ ] **Turn on the Wispr Flow Bar** under Settings → System. It is hidden by
      default on new installs, and a recording without it on screen loses the
      evidence that the input was spoken.
- [ ] Register on the challenge site with the **same email** as your Wispr account

## While building — what the usage card shows

Dictate all of it:

- every prompt and correction to your agents
- all 34 golden test updates (this is the single biggest block of words, and it
  is work you have to do anyway)
- SPEC.md, and every update to it after a phase
- every feedback note
- your #NoHandsChallenge posts
- the README
- the submission write-up

Real daily use in Phase 8 adds more words naturally.

**Keyboard is allowed for shortcuts and small fixes.** The rule is voice for
prompts, docs and messages — not voice for every keystroke. Dictating a
one-character typo fix is theatre, and judges are looking at the volume of
*writing* that went through Flow.

## Proof for the demo

- Keep the Wispr Flow Bar visible in **every** recording.
- Save one clip per phase of you dictating to an agent. Cut the best two seconds
  of each into the demo's opening — that is how you show the whole build was
  spoken in a video that only has two minutes.
- Take the usage card screenshot from **Insights** in the desktop app, at the
  end, after the write-up is dictated.

## Designing the app for dictation

Four design consequences, all already in the base:

1. **The speak box autofocuses.** Open `/app`, hold the key, talk. No click.
2. **Every input is a dictation target.** There is no form in SayOnce that
   expects typing — the contact entry is one box, the feedback is one box, the
   command bar is one box.
3. **Unclear fields are highlighted, never guessed.** When you dictate a contact
   and leave out the phone number, the field is flagged. Inventing a plausible
   number would be the worst possible failure mode for a tool whose whole claim
   is that it does not invent things.
4. **A keyboard shortcut triggers the main action**, so the hands-free path is
   complete: speak, Ctrl+Enter, review, tap send.

## The leaderboard bonus

There is a separate ₹1,00,000 attached to Wispr usage: ₹50,000 for rank 1 and
₹50,000 drawn at random from everyone on the board. Uploading the usage card
each week is what puts you on it.

That is a real reason to dictate the golden set rather than type it — 34 spoken
updates is a lot of words, and they are words you need anyway.
