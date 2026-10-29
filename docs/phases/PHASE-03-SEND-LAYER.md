# Phase 3 — Send layer

**Hours 8–11.** Earlier phases must keep passing.

**Goal:** one tap from draft to sent, on desktop and on a real phone.

This is the block people skip and regret. A broken Devanagari WhatsApp message
is only visible on a device, and it is visible to a judge on the first tap.

---

## What already exists

`lib/links.ts`, with 33 round-trip tests covering Devanagari, emoji, line
breaks, `&`, `#`, `?`, quotes, accents and very long bodies:

- `whatsappLink(phoneE164, body)` → `https://wa.me/<digits>?text=<encoded>`
- `mailtoLink(email, subject, body)` → CRLF line breaks, `%20` not `+`
- `sendTargetFor(draft, contact)` → the href, the label, and the reason it is
  blocked when a contact has no phone or email
- `decodeSendLink(href)` → decodes a link back for the round-trip test

`DraftCard` already wires Copy, the send button, and the disabled state with a
reason.

## Build

### 1. The send-test page — dev only

A page listing **twelve tricky bodies**: Devanagari, very long text, special
characters, emoji, an empty subject, mixed scripts, a number with a `+`.

For each: generate both links, decode them back, and compare with the original
**byte for byte**. Show pass/fail.

The unit tests already cover this at the function level. The page exists because
*a link that decodes correctly can still open the wrong thing on a real device*,
and you need somewhere to tap twelve of them in a row.

Make sure it is not in the production build, or is behind a dev-only check.

### 2. Mark as sent

- Auto-set when a send button is used, and editable
- Persists to `messages.sent` and `messages.sent_at`
- Writes a `sent` entry to the Trust Trail

### 3. "Send all" — a guided queue

One card at a time, with a Next button and progress ("2 of 5").

Not a burst of `window.open` calls: browsers block those, and a blocked popup
mid-demo looks like the product is broken.

### 4. Channel rules enforced at Compose

Already in the Compose prompt and `CHANNEL_LIMITS`. Confirm they hold in
practice:

- WhatsApp bodies under 700 characters
- No markdown symbols WhatsApp would show literally (`##`, `- `, `[text](url)`)
- Email subjects under 70 characters, never empty

The checker already fails a draft that breaks these, which means a Compose
regression shows up as a red card rather than a bad message.

---

## Device testing — the part that matters

Ten real sends to your own number, across:

- **Android Chrome**
- **iOS Safari**
- **desktop Chrome**

Check specifically:

- [ ] Devanagari arrives unbroken
- [ ] Line breaks survive
- [ ] Nothing is truncated
- [ ] The chat that opens is the **right** chat
- [ ] Numbers from **three different countries** open correctly
- [ ] Emoji survive
- [ ] `&`, `#`, `?` and `=` in a body do not break the link
- [ ] An email opens with both subject and body filled in
- [ ] A long WhatsApp body is not silently cut

Dictate the results and feed failures back as specific cases.

---

## Acceptance criteria

- [ ] Hindi (Devanagari), Hinglish, emoji, line breaks, `&`, `#` and `?` all
      survive the round trip into WhatsApp and the mail app with **no broken
      characters and no truncation**
- [ ] Phone numbers from three countries open the right chat
- [ ] Works on Android Chrome, iOS Safari and desktop Chrome
- [ ] A contact with no phone shows a **reason**, not a dead button
- [ ] "Send all" never triggers a popup block
- [ ] `messages.sent` persists, and every send writes a trail entry

## Cut line

- The "Send all" guided queue. Individual send buttons are enough for the demo
  and for real use with five contacts.
- The send-test page can be replaced by running the existing unit tests plus ten
  manual sends — but **do not cut the manual sends**.

## Gate

Full [standard gate](PHASE-GATE.md), plus:

- [ ] The twelve-case round-trip table, pass/fail
- [ ] Device test results for all three platforms
- [ ] `npm run lab` — the full set still at target

One extra item worth adding to the Wispr log for this phase: record the phone
tapping a WhatsApp send and the message appearing. That three seconds is the
most convincing clip in the whole demo.
