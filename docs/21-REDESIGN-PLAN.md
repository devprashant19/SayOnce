# Redesign implementation plan

The product works. It does not yet **look** like it works. This plan fixes that
in eight stages, and the first one ships on its own.

Design system: [`20-DESIGN-SYSTEM.md`](20-DESIGN-SYSTEM.md). It is
authoritative — read it before writing a line of CSS.

**Hard rule for the whole redesign:** this is a visual and interaction pass. It
must not change a single pipeline behaviour, accuracy target, or any figure on
`/proof`. `npm run test` must stay at the same count or higher, and
`npm run lab` must not move. If a redesign commit changes a lab number, it has
touched something it should not have.

---

## Visual verification — required at every stage

**Do not close a stage without screenshotting it and running the checker.** An
agent that never looks at its own output ships overlapping text, and
screenshots alone do not help either, because nobody compares 56 PNGs by eye.

```bash
npm i -D playwright && npx playwright install chromium   # once
npm run build && npm run start                           # in one terminal
npm run visual                                           # in another
npm run visual -- --route /app --width 375               # one screen
npm run visual -- --open                                 # + HTML contact sheet
```

`scripts/visual-check.mjs` captures every route × 4 widths × 2 themes into
`.visual/` and then asks the browser five questions it can answer definitively:

| Check | Fails when |
| --- | --- |
| `horizontal-overflow` | the page scrolls sideways |
| `element-overflow` | a box extends past the viewport |
| `text-overlap` | two text boxes intersect by more than 35% |
| `clipped-text` | content is cut off by its own container |
| `small-target` | an interactive element is under 44px tall |

It exits non-zero on any finding, so it can gate a commit.

### The baseline it reports today

Run against the current UI at 375px before any redesign work:

```
222  element-overflow
 92  small-target
  1  text-overlap     /lab: "gemini-3.1-flash-lite" overlaps "0" by 100%
```

So the "usable at 360px" gate that earlier phases recorded as passed **was not
actually met**. The table on `/lab` extends to 818px inside a 375px viewport,
and every header link is a 20px-tall tap target.

**Target: zero findings at all four widths in both themes, by the end of R8.**
Each stage should drive its own routes to zero and not regress another's.

### What the checker cannot tell you

It measures geometry, not quality. It will pass a page that is correctly laid
out and ugly. So also **open the contact sheet and look**:

- Does the type hierarchy read at a glance, or is everything the same weight?
- Is the spacing rhythm consistent, or does each section invent its own?
- Does the page look like the other pages' sibling, or like a different product?
- With `--reduced-motion`, does it still look composed, or does it look broken?
- Is there one obvious primary action?

## The core problem to solve

Right now every page looks like the same page. Same width, same card, same
header, same rhythm. That reads as a template, and a judge scrolling five
screens cannot tell them apart.

**So each page gets its own spatial identity** — a different layout archetype,
a different dominant element, a different reading rhythm — while sharing one
palette, one type triad, one easing and one logo.

| Route | Archetype | Dominant element | Feels like |
| --- | --- | --- | --- |
| `/` | Scroll narrative | Full-bleed scenes | A story |
| `/app` | Two-pane console | The Speak box, then the fan | An instrument |
| `/people` | Roster / directory | A dense list with a detail drawer | A contact book |
| `/log` | Ledger | A table with a timeline drawer | A record |
| `/lab` | Benchmark report | A metrics table | A test report |
| `/proof` | Editorial one-pager | Big measured figures | A tear sheet |
| `/demo` | Guided walkthrough | A tour overlay on `/app` | A hosted tour |

No two of those share a layout. That is the point.

---

## Stage R0 — Install the foundation

**Ship this before any page work.** Everything else assumes it.

1. **Fonts** via `next/font/google` in `app/layout.tsx`: Inter (`--font-inter`),
   Newsreader (`--font-serif`), JetBrains Mono (`--font-mono`). Keep
   `Noto Sans Devanagari` in the sans and mono stacks.
2. **Tokens and motion**: replace the token block in `app/globals.css` with the
   CSS in §5 of the design system, verbatim.
3. **Dark mode**: `darkMode: "class"`. A `ThemeToggle` that writes
   `localStorage` (wrapped in try/catch — it throws in a private window),
   respects `prefers-color-scheme` on first visit, and adds
   `html.theme-transition` for 250ms while switching so the change cross-fades
   instead of snapping.
4. **Icons**: `npm i lucide-react`. Delete every emoji used as an icon.
5. **Logo**: `components/SayOnceLogo.tsx` already exists. Put
   `<SayOnceWordmark>` in the header and use `animated` once, in the hero.
6. **Favicon + OG**: wire `public/favicon.svg`; generate a 1200×630 OG image
   from the hero.
7. **Primitives** in `components/ui/`: `Button`, `Card`, `Input`, `Textarea`,
   `Pill`, `Drawer`, `Modal`, `Skeleton`, `Tooltip`, `EmptyState`. Every page
   uses these — no page-local button styles.

**Gate:** `npm run verify:all` green, both themes render, the toggle
cross-fades, zero emoji icons remain, every lab number unchanged.

**Commit:** `feat(ui): install the design system foundation`

---

## Stage R1 — The landing page, on its own

**This is the first deliverable and it ships alone.** It is the first thing a
judge opens, and it is the only part of the entry judged on craft. Do not start
R2 until R1 is merged and tagged.

Route `/`. Full concept in [`14-LANDING-PAGE.md`](14-LANDING-PAGE.md); this is
the visual brief.

### Structure

A scroll narrative with **pinned scenes**, not a stack of marketing sections.
Scroll-driven, never autoplay — a judge who scrolls fast is never waiting.

**Hero.** Full viewport. `<SayOnceWordmark size={56} animated />`. The headline
in Newsreader at `clamp(2.75rem, 7vw, 5.5rem)`, tight leading, two lines:

> Say it once.
> Everyone gets their version.

One sentence of `muted` sub-copy. Two buttons: *Try it with your voice*
(accent) and *Judge demo — no sign-in* (secondary). Behind them, a **live
waveform** of thin `accent` bars at 18% opacity using `.wave-bar` with
staggered delays — the only ambient motion on the page. The primary button must
be visible without scrolling at 375px.

**Scene 1 — Speak.** A Hinglish sentence types itself in mono. Filler words
(`um`, repeated words) strike through and fade as it goes. This is the argument
for dictation, made visually.

**Scene 2 — Extract.** The sentence breaks apart; facts lift out as chips —
a date, a quantity, a person, and one wearing a padlock in `locked` grey.

**Scene 3 — Route.** Chips travel along curved SVG paths to five avatars. The
locked chip hits a shield in front of the client and **bounces off**. Animate
`stroke-dashoffset` on the paths, not `width`.

**Scene 4 — Compose. The signature moment.** Each avatar unfolds into a message
card in its own language and script: formal English email, Devanagari WhatsApp,
Hinglish, Spanish. Text writes itself in, staggered 60ms via
`.stagger-children`. This is the one place motion is the point.

**Interactive strip.** Between scenes 4 and 5: *"Try it here."* A real textarea
plus three sample chips. Samples serve **cached** results — instant, and it
cannot fail in front of a judge. Custom input calls the live pipeline with a
three-contact demo set and shows skeleton cards while it runs.

**Scene 5 — Verify.** Thin provenance lines draw from each sentence back to the
spoken words; check marks land one by one with `.animate-check-pop`.

**Scene 6 — Trust.** The Trust Trail slides past as linked entries with short
hashes in mono. The Knowledge Matrix assembles cell by cell.

**Close.** One line on who it is for, the primary button again, a quiet footer
crediting the challenge.

### Transition into the app

The final button morphs into the app's Speak box using the **View Transitions
API** — same `view-transition-name` on both. `SpeakBox` already carries
`viewTransitionName: "speak-box"`. Cross-fade fallback where unsupported; it
must degrade cleanly in Safari and Firefox, not break.

### Honesty

**Real copy only.** No invented logos, no testimonials, no made-up metrics.
Every number is read from `lib/proof.ts` or labelled as a sample. If a figure
has no data behind it, the page says so.

### Budget

LCP under 2.5s on a throttled mid-range phone. No layout shift. 60fps scroll on
desktop. First scene readable within 1s. Lazy-load everything below scene 2.
**Measure it** — a landing page that misses this is worse than the plain one.

### Cut line, in order

Knowledge Matrix assembly → SVG path travel (fade chips instead) → the
waveform (static image) → scene 6 entirely. **Three good scenes beat six
rushed ones.** Never cut: the headline, scene 4, the interactive strip, the
button above the fold, or the reduced-motion version.

**Gate:** 375/768/1024/1440 + reduced motion. A first-time visitor can say what
SayOnce does after one scroll. Transition works in Chrome, degrades elsewhere.
LCP measured and under budget. Lighthouse a11y ≥95.

**Commit:** `feat(landing): scroll narrative, signature fan-out, view transition`
**Tag:** `redesign-r1-landing`

---

## Stage R2 — `/app`, the console

The working surface. It must feel like an instrument, not a form.

**Two-pane at ≥1024px**, stacked below. Left pane (sticky, 40%): the Speak box,
project picker, contact-set picker, Fan out, and — after a run — the spoken
text with the extracted facts beneath it. Right pane (60%, scrolls): the cards.

- Speak box on `surface-raised`, mono, large, autofocused, growing. A thin
  `accent` ring while focused. The hint — *"Hold your Wispr key and talk"* —
  sits below in `muted`, and fades out once there is text.
- **Ctrl/Cmd+Enter** fans out. Show the shortcut as a `kbd` chip on the button.
- Cards arrive with `.stagger-children`. **This is the signature moment** —
  nothing else on this page animates beyond a hover lift.
- Each card: name in Newsreader, role in `muted`, language and channel as
  pills, the body in mono, and the state pill. `verified` green when the
  checker passed; `needs your eyes` in `blocked` red with the failing reasons
  listed and the offending phrase struck through, send disabled.
- **Provenance:** hovering or focusing a sentence highlights its source span in
  the left pane. Works on touch and on keyboard, not hover only.
- Knowledge Matrix as a collapsible panel. At 375px it scrolls horizontally
  with a sticky first column.

**Gate:** dictation lands with no click. Fan-out staggers. A blocked card
cannot be sent. Provenance works by keyboard. Usable at 375px.

**Commit:** `feat(ui): rebuild the speak console as a two-pane instrument`

---

## Stage R3 — `/people`, the roster

A directory, not a form page.

A dense two-line list — avatar initial, name in Newsreader, role in `muted`,
then language / channel / formality pills right-aligned. Click a row and a
**right drawer** slides in with `.animate-slide-in-right` over a
`backdrop-blur-md` veil, holding the full profile and the `never tell` topics
as `locked` pills.

The voice-entry box sits at the top, visually distinct — a dashed `accent`
border — labelled *"Dictate a whole contact"*. Unclear fields come back
highlighted in `review` amber, never guessed.

**Gate:** drawer traps focus and closes on Escape. 44px rows. Empty state
invites the first contact.

**Commit:** `feat(ui): people book as a roster with a detail drawer`

---

## Stage R4 — `/log`, the ledger

Must look like a record someone keeps. Dense, scannable, newest first.

A real `<table>`: date (mono), project, summary, recipients as stacked
avatars, sent count, and a Trust Trail link. Zebra rows on `surface-raised`.
Filter pills above; CSV export top-right. Clicking a row opens the **trail
timeline** in a drawer — each entry a node on a vertical rule, hash in mono,
and a *Verify trail* button that turns the whole rule green with
`.animate-check-pop` cascading down it.

**Gate:** 500 rows stay smooth. Table is a real table with scope'd headers.
Horizontal scroll at 375px, not squashed.

**Commit:** `feat(ui): update log as a ledger with a trail timeline`

---

## Stage R5 — `/lab`, the report

It should read like a test report, because that is the accuracy argument.

A metrics table: metric, result, target, verdict pill — hard gates marked as
such. Below it, a per-case grid of small squares, green/red/amber, each a
tooltip with the case id and failure reason. A sparkline of run history, so
improvement is visible rather than claimed. One big *Run all* button with a
determinate progress bar using `.animate-shimmer`.

**Gate:** readable by someone who has not seen the code. Hard-gate failures are
unmissable. Run history visible.

**Commit:** `feat(ui): quality lab as a benchmark report`

---

## Stage R6 — `/proof`, the tear sheet

Editorial, one column, generous space. Big measured figures in Newsreader with
mono units. **The honest-gap discipline from `lib/proof.ts` is load-bearing
here and must not be designed away** — "Not yet measured" is a legitimate state
and must look deliberate, not broken: `muted`, smaller than a real figure,
with the reason beneath it.

**Gate:** no hardcoded figure survives (`tests/proof.test.ts` enforces it). No
name, phone or email. Reads well both empty and full.

**Commit:** `feat(ui): proof as an editorial tear sheet`

---

## Stage R7 — `/demo`, the guided tour

`/app` with a tour overlay. A floating step card, bottom-right, with
*Next*/*Skip* and a progress dot row; a spotlight ring on the target element
drawn with `box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.55)` so nothing shifts. Five
steps: Fan out → Knowledge Matrix → provenance → a Privacy Shield block →
Verify trail.

A persistent slim banner: *"Demo mode. Press Fan out, or replace the text with
your own."* Dataset picker as a segmented control.

**Gate:** tour skippable and keyboard-navigable. Fan out instant on a sample.
Reset demo restores the start.

**Commit:** `feat(ui): judge demo with a guided tour overlay`

---

## Stage R8 — Polish and audit

1. **`npm run visual` must report zero findings** across all 7 routes, 4
   widths and both themes — plus a `--reduced-motion` pass. Then open the
   contact sheet (`npm run visual -- --open`) and review every screen against
   the §9 checklist by eye: hierarchy, spacing rhythm, family resemblance, one
   primary action.
2. **Lighthouse** on `/`, `/app`, `/proof` — a11y ≥95, no CLS.
3. **Keyboard-only pass** through every route: no trap, focus always visible,
   every action reachable.
4. **Reduced motion** pass: every route complete and calm.
5. **Devanagari check** on every surface that renders a draft.
6. `npm run verify:all`, `npm run lab`, `npm run audit:secrets`.
7. **Confirm the lab numbers did not move.** If they did, the redesign touched
   logic.

**Commit:** `chore(ui): redesign polish and accessibility audit`
**Tag:** `redesign-complete`

---

## Order, and why

R0 and R1 first because the landing page is what a judge opens and it can ship
alone. Then R2, because `/app` is where the product actually lives. Then R6 —
`/proof` is small and it is the accuracy argument. Then R3, R4, R5, R7 in
whatever order the clock allows, and R8 last.

**If time runs out**, a product with a finished landing page, a finished
console and a finished proof page beats seven half-redesigned pages. Stop at a
stage boundary, never mid-stage.
