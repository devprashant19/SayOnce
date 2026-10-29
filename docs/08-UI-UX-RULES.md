# UI and UX rules

The interface has one job: let someone who has never seen SayOnce speak an
update and send five messages without being taught anything.

## The five UI checks

Every phase gate runs these. All five, every time.

1. **One primary action per screen.** Speak has Fan out. Nothing competes with it.
2. **Readable on a phone at 360 px.** Not "responsive" — actually tested at 360.
3. **Every button says what it does.** "Open in WhatsApp", not "Send". "Fan out",
   not "Go".
4. **Empty, loading and error states exist on every screen.** A blank screen is
   a bug. For AI steps use skeletons, not spinners — a skeleton says what is
   coming.
5. **Nothing needs a keyboard except Wispr's hotkey.** Everything is reachable
   by mouse and touch; everything is *also* reachable by keyboard.

## Design tokens

In `app/globals.css`, one `@theme` block. Light and dark, with dark defined
under both `prefers-color-scheme` and an explicit `[data-theme="dark"]`.

```
ink / ink-soft / ink-faint       text
paper / paper-sunk              surfaces
rule                            borders
verified / warning / blocked / locked    state
accent                          the one action colour
```

### Colour carries meaning only

| Colour | Means | Used for |
| --- | --- | --- |
| green | verified | "Facts verified" badge |
| amber | warning | degraded, a soft problem, a limit reached |
| red | blocked | a failed check, a privacy leak, a broken trail |
| grey | locked | a fact deliberately withheld |
| accent | the primary action | one per screen |

Nothing else is coloured. A judge glancing at a screen of cards should be able
to read its state without reading a word.

**Colour is never the only signal.** Every badge carries its meaning in text as
well, because roughly one in twelve men cannot distinguish the green from the
red.

## Typography

System sans, with `"Noto Sans Devanagari"` in the stack — a Devanagari draft
rendering in a fallback font looks broken on exactly the screen that is meant to
prove the product works.

One size scale. Body text at 16 px minimum; iOS zooms inputs below that, which
breaks the layout mid-demo.

## Motion

**One signature moment: drafts fanning out as cards after Fan out.** Everything
else is quiet. The animation is in `globals.css` as `.fan-in`, staggered 60 ms
per card, capped at eight.

- `prefers-reduced-motion` gets a complete, calm static version with all the
  content. Not a degraded one — a different one that is just as good.
- Every frame should work as a still. If a frame mid-animation looks wrong, the
  animation is wrong.
- No layout shift. Reserve space before content arrives.
- Native cursor kept. No custom cursors, ever.

## Accessibility — WCAG 2.1 AA

Non-negotiable, and cheap if done from the start.

| Requirement | How |
| --- | --- |
| Keyboard reachable | Everything. Including the provenance sentence list, which is `tabIndex={0}` and highlights on focus as well as hover. |
| Visible focus | `:focus-visible` outline in the accent colour, 2 px, 2 px offset. Never removed. |
| Contrast | 4.5:1 for body text, 3:1 for large text and UI borders, in **both** themes. |
| Labels on all inputs | A real `<label>`, or `sr-only` where the visual design cannot carry one. |
| Screen-reader names on icon buttons | Every icon-only control. |
| Skip link | First focusable element, jumps to `#main`. |
| Live regions | Errors are `role="alert"`; the loading state is `aria-live="polite"`. |
| Touch targets | 44 px minimum. `min-h-11` on every button and link that acts as one. |
| Language attributes | `lang` on the page; set `lang` on a draft body when it is not English, so a screen reader pronounces Devanagari correctly. |

Target: Lighthouse accessibility 95+.

## The speak box

`components/SpeakBox.tsx` is the entire Wispr integration, and it has rules of
its own because it is the one component Wispr writes into:

- **autofocus** — dictated text must land with no click. This is the first thing
  a judge will try.
- **Never move the cursor or rewrite the value while the user is dictating.** No
  controlled-input tricks, no auto-formatting, no "helpful" capitalisation.
- **Grows with the text** rather than scrolling a six-line window.
- **Accepts pasted text from anywhere.**
- **Large, with a visible hint**: "Hold your Wispr key and talk."
- **Ctrl/Cmd+Enter fans out**, so an update can be spoken and sent without
  touching the mouse.

Every other text input in the app — the contact entry box, the feedback box,
the command bar — follows the same rules, because they are all dictated too.

## Cards

One card per reader. The card is where the accuracy promise becomes visible.

| State | Looks like |
| --- | --- |
| Verified | Green "Facts verified" badge, tooltip listing the checks run, send button enabled |
| Held back | Red panel naming exactly what is wrong, with the offending phrase struck through, send button **disabled** with a tooltip explaining why |
| No draft | Amber panel with the reason, Copy still available |
| Cannot send | Send disabled with the reason beside it: "Ramesh has no phone number yet. Add one in the People Book." |

A card that cannot be trusted must never be one tap from sending.

## Error messages

Every one names what happened and what to do:

> "No facts found in that update. Say what changed, for whom, and by when."

Not "An error occurred". Not a stack trace. Not a toast that disappears before
it can be read.

## Screens checklist

Per screen, before a gate:

- [ ] 360 px, 768 px, 1440 px
- [ ] light and dark
- [ ] empty, loading, error
- [ ] tab through it start to finish; focus always visible, no trap
- [ ] one primary action, obvious
- [ ] with `prefers-reduced-motion` on
- [ ] with a Devanagari draft on screen, to check the font

Screenshot all of it at each gate. Phase 6 does this systematically.

## Phase 6's design pass

The design system is chosen in Phase 6, suited to a calm, trustworthy
productivity tool — not a consumer app. Tokens for colour, type, spacing and
radius; light and dark. Then a pass over every screen for consistent spacing,
language badges, channel icons, the mobile layout, and a three-step "how it
works" strip on first visit.

The tokens in `globals.css` are the starting point, not the final answer. What
must survive any redesign: colour means state, one action per screen, 360 px,
focus visible, reduced motion complete.
