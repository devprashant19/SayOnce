# R3 — UI and accessibility

Full detail in [../08-UI-UX-RULES.md](../08-UI-UX-RULES.md). This is the
enforceable short list.

## The five checks, at every gate

1. One primary action per screen.
2. Readable on a phone at 360 px — tested, not assumed.
3. Every button says what it does. "Open in WhatsApp", not "Send".
4. Empty, loading and error states on every screen. Skeletons for AI steps, not
   spinners.
5. Nothing needs a keyboard except Wispr's hotkey — and everything is *also*
   reachable by keyboard.

## Colour

Colour carries meaning only: **green verified, amber warning, red blocked, grey
locked**, accent for the one action. Nothing else is coloured.

**Colour is never the only signal.** Every badge carries its meaning in words
too.

## Accessibility — WCAG 2.1 AA, non-negotiable

- Visible `:focus-visible` outline. Never removed, never `outline: none`.
- 4.5:1 contrast for body text, 3:1 for large text and UI borders, in **both**
  themes.
- A real `<label>` on every input, or `sr-only` where the design cannot carry one.
- Accessible names on every icon-only button.
- Skip link as the first focusable element.
- Errors are `role="alert"`; loading is `aria-live="polite"`.
- Touch targets 44 px minimum (`min-h-11`).
- `lang` on a draft body that is not English, so a screen reader pronounces
  Devanagari correctly.

Target Lighthouse accessibility 95+.

## Motion

One signature moment: drafts fanning out after Fan out. Everything else quiet.

`prefers-reduced-motion` gets a **complete, calm static version** — not a
degraded one. Every animation frame must work as a still. No layout shift.
Native cursor kept.

## Text inputs

Every text input in SayOnce is a dictation target, so all of them follow the
speak-box rules: autofocus where it is the primary action, large, grows with
content, accepts paste, and **never fights the cursor**. No controlled-input
tricks, no auto-formatting, no helpful capitalisation.

Body text and inputs at 16 px minimum — iOS zooms smaller inputs and breaks the
layout mid-demo.

## Fonts

`"Noto Sans Devanagari"` stays in the font stack. A Devanagari draft rendering
in a fallback font looks broken on exactly the screen meant to prove the product
works.

## Cards

| State | Must look like |
| --- | --- |
| Verified | Green badge, tooltip listing the checks run, send enabled |
| Held back | Red panel naming what is wrong, offending phrase struck through, **send disabled** with a tooltip saying why |
| No draft | Amber panel with the reason, Copy still available |
| Cannot send | Send disabled with the reason beside it, naming the fix |

A card that cannot be trusted is never one tap from sending.

## Error messages

Name what happened and what to do:

> "No facts found in that update. Say what changed, for whom, and by when."

Not "An error occurred". Not a stack trace. Not a toast that vanishes before it
can be read.

## Per-screen checklist

- [ ] 360 / 768 / 1440 px
- [ ] light and dark
- [ ] empty, loading, error
- [ ] tab start to finish; focus visible; no trap
- [ ] one obvious primary action
- [ ] reduced motion on
- [ ] a Devanagari draft on screen
