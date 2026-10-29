# Design system

Adapted from the Parity design system (`../../Parity/DESIGN.md` and
`../../Parity/design-system/parity/MASTER.md`). Same visual language, same
motion vocabulary, same discipline — retuned for SayOnce's concept.

**This file is authoritative.** Where a component disagrees with it, the
component is wrong.

---

## 1. Concept card

| Dimension | Specification |
| --- | --- |
| **Idea** | A voice-first dispatch instrument that turns one spoken update into a different, fact-checked message for every person who needs it. |
| **Metaphor** | **The telephone exchange operator's board.** One incoming line, many outgoing lines, each patched deliberately — and a switch that physically cannot connect a line that was marked private. |
| **Signature moment** | **The fan-out.** One block of spoken text resolves into a column of cards, each in a different language and script, each carrying a different subset of the facts, staggered so you watch the split happen. |
| **Emotion** | Calm operational control. The feeling of having told everyone correctly and knowing it. |
| **Motion verb** | **Settle like a relay closing:** every transition arrives fast and damps immediately — `cubic-bezier(0.16, 1, 0.3, 1)`, no float, no bounce, no drift. |
| **Screenshot frame** | The Speak box with the spoken Hinglish still in it, four fanned cards beside it — one Devanagari, one Hinglish, one formal English, one visibly blocked with its leaking phrase struck through. |

## 2. Palette, mapped to roles

Never reach for a raw Tailwind colour. Every colour has a role, and the role is
the only reason to use it.

| Role | Light | Dark (Obsidian) | Contrast | Used for |
| --- | --- | --- | --- | --- |
| `ground` | `#F8FAFC` | `#080A0F` | — | Root canvas |
| `surface` | `#FFFFFF` | `#10141E` | — | Cards, modals, drawers |
| `surface-raised` | `#F1F5F9` | `#182030` | — | Hover rows, code wells, inputs |
| `ink` | `#0F172A` | `#F8FAFC` | 16.2:1 | Headings, primary text |
| `muted` | `#475569` | `#94A3B8` | 6.5:1 | Metadata, help text, captions |
| `line` | `#E2E8F0` | `#1F293D` | — | Hairlines, table rules, borders |
| `accent` | `#2563EB` | `#3B82F6` | 5.2:1 | The one primary action per screen |
| `accent-hover` | `#1D4ED8` | `#60A5FA` | — | Hover on accent |
| `signal-verified` | `#059669` | `#34D399` | 5.3:1 | Facts verified |
| `signal-blocked` | `#E11D48` | `#FB7185` | 5.4:1 | A failed check, a privacy leak |
| `signal-review` | `#D97706` | `#FBBF24` | 5.0:1 | Warning, degraded, limit reached |
| `locked` | `#64748B` | `#64748B` | — | A fact deliberately withheld |

**The rule that survives any redesign:** colour carries state and nothing else.
No decorative colour, no gradient for mood, no tinted section backgrounds. A
judge glancing at a screen of cards reads its state without reading a word —
and every signal also carries its meaning in text, because colour alone fails
roughly one in twelve men.

## 3. Typography — a three-voice triad

| Voice | Family | Used for |
| --- | --- | --- |
| **Display** | `Newsreader` (serif) | The wordmark, page titles, section headings, modal titles. Carries the "record, document, correspondence" feeling. |
| **Interface** | `Inter` (sans) | Everything operational: navigation, buttons, labels, body copy, card text. |
| **Telemetry** | `JetBrains Mono` with `tnum` | Numbers that must align: counts, percentages, timings, hashes, fact ids, phone numbers, and **the spoken text itself**. |

Loaded with `next/font/google` as CSS variables — never a bare `@import` in
CSS, which blocks render.

```ts
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
```

**`Noto Sans Devanagari` stays in the sans stack.** A Devanagari draft
rendering in a fallback font looks broken on exactly the screen meant to prove
the product works. This is non-negotiable and it is SayOnce's one addition to
Parity's triad.

Spoken text and drafted message bodies are set in **mono**. That is deliberate:
it makes the Devanagari and Latin columns align, it reads as a transcript
rather than as prose, and it makes an invented number visually obvious.

## 4. Motion vocabulary

**One easing for the entire product:**

```
--ease: cubic-bezier(0.16, 1, 0.3, 1);
```

Fast out, hard damp, no overshoot. If a motion looks like it floats, drifts or
bounces, it is wrong.

| Duration | Used for |
| --- | --- |
| 150ms | Tactile press, focus ring |
| 180–200ms | Badge pop, checkmark, tooltip |
| 220ms | Card lift, hover |
| 240–250ms | Fade in, theme cross-fade |
| 300ms | Drawer slide, page transition |
| 1.5s loop | Shimmer, waveform, pulse |

### Required utilities

- `.active-press` — `scale(0.975)` on `:active`. On **every** button.
- `.hover-card-lift` — `translateY(-2px)` on hover, settles to `0` on active.
- `.animate-fade-in` — the entrance for anything that arrives.
- `.animate-slide-in-right` — drawers and panels only.
- `.animate-badge-pop` — a state badge changing.
- `.animate-check-pop` — a check mark landing.
- `.animate-shimmer` — skeletons and progress.
- `.stagger-children` — the fan-out, 60ms per child, capped at 8.

### Rules

- **One signature moment per screen.** On `/app` it is the fan-out. Everything
  else is quiet.
- **Every frame works as a still.** If a mid-animation frame looks wrong, the
  animation is wrong.
- **No layout shift.** Reserve space before content arrives. Never animate
  `width`/`height`/`top`/`left` — only `transform` and `opacity`.
- **`prefers-reduced-motion` gets a complete, calm version** with all the
  content. Not a degraded one.
- **Native cursor.** No custom cursors, ever.
- Skeletons, not spinners, for anything AI-backed. A skeleton says what is
  coming.

## 5. The CSS to install

Replace the token and motion blocks in `app/globals.css` with this. Keep
Tailwind v4's `@theme` so the tokens are available as utilities.

```css
@import "tailwindcss";

@theme {
  --color-ground: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-raised: #f1f5f9;
  --color-ink: #0f172a;
  --color-muted: #475569;
  --color-line: #e2e8f0;
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-verified: #059669;
  --color-blocked: #e11d48;
  --color-review: #d97706;
  --color-locked: #64748b;

  --font-sans: var(--font-inter), system-ui, -apple-system, "Noto Sans Devanagari", sans-serif;
  --font-serif: var(--font-serif), Georgia, serif;
  --font-mono: var(--font-mono), "JetBrains Mono", "Noto Sans Devanagari", monospace;

  --radius-card: 12px;
  --radius-control: 8px;
  --radius-modal: 16px;

  --space-xs: 4px;  --space-sm: 8px;   --space-md: 16px;
  --space-lg: 24px; --space-xl: 32px;  --space-2xl: 48px; --space-3xl: 64px;
}

:root {
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.04);
}

.dark {
  --color-ground: #080a0f;
  --color-surface: #10141e;
  --color-surface-raised: #182030;
  --color-ink: #f8fafc;
  --color-muted: #94a3b8;
  --color-line: #1f293d;
  --color-accent: #3b82f6;
  --color-accent-hover: #60a5fa;
  --color-verified: #34d399;
  --color-blocked: #fb7185;
  --color-review: #fbbf24;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.4);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.5);
}

body {
  background: var(--color-ground);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.011em;
}

.font-serif-display { font-family: var(--font-serif); }
.font-mono-val {
  font-family: var(--font-mono);
  font-feature-settings: "tnum" on, "zero" on;
}

/* Theme cross-fade, applied only while switching. */
html.theme-transition,
html.theme-transition *,
html.theme-transition *::before,
html.theme-transition *::after {
  transition:
    background-color 250ms var(--ease),
    border-color 250ms var(--ease),
    color 200ms var(--ease),
    box-shadow 250ms var(--ease) !important;
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.active-press { transition: transform 150ms var(--ease), box-shadow 150ms var(--ease); }
.active-press:active { transform: scale(0.975); }

.hover-card-lift {
  transition: transform 220ms var(--ease), box-shadow 220ms var(--ease),
              border-color 220ms var(--ease);
}
.hover-card-lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.hover-card-lift:active { transform: translateY(0) scale(0.99); }

@keyframes fade-in      { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes badge-pop    { 0% { transform: scale(0.92); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes check-pop    { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
@keyframes shimmer      { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes wave         { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes logo-in      { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }

.animate-fade-in        { animation: fade-in 240ms var(--ease) both; }
.animate-slide-in-right { animation: slide-in-right 300ms var(--ease) both; }
.animate-badge-pop      { animation: badge-pop 200ms var(--ease) both; }
.animate-check-pop      { animation: check-pop 180ms var(--ease) both; }
.animate-shimmer        { animation: shimmer 1.5s ease-in-out infinite; }
.wave-bar               { transform-origin: center; animation: wave 1.6s ease-in-out infinite; }

/* The fan-out: the one signature moment. */
.stagger-children > * { animation: fade-in 320ms var(--ease) both; }
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 60ms; }
.stagger-children > *:nth-child(3) { animation-delay: 120ms; }
.stagger-children > *:nth-child(4) { animation-delay: 180ms; }
.stagger-children > *:nth-child(5) { animation-delay: 240ms; }
.stagger-children > *:nth-child(6) { animation-delay: 300ms; }
.stagger-children > *:nth-child(n + 7) { animation-delay: 360ms; }

.logo-origin { animation: logo-in 260ms var(--ease) both; }
.logo-fan    { animation: logo-in 260ms var(--ease) both; }
.logo-fan-1  { animation-delay: 70ms; }
.logo-fan-2  { animation-delay: 110ms; }
.logo-fan-3  { animation-delay: 150ms; }
.logo-fan-4  { animation-delay: 190ms; }
.logo-fan-5  { animation-delay: 230ms; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .hover-card-lift:hover, .active-press:active { transform: none; }
}
```

## 6. Components

### Buttons

```
primary    bg-accent, white text, radius-control, font-semibold, .active-press
secondary  transparent, 1px line border, ink text, .active-press
ghost      transparent, no border, muted text → ink on hover
destructive bg-blocked, white text — only for a genuinely destructive action
```

Minimum height **44px** on anything tappable. `cursor-pointer` on everything
clickable, without exception.

### Cards

`surface` background, 1px `line` border, `radius-card`, `shadow-sm` at rest,
`shadow-lg` on hover via `.hover-card-lift`. Padding `space-lg`.

### Inputs

`surface-raised` background, 1px `line` border, `radius-control`, 16px text
minimum (iOS zooms below that and breaks the layout mid-demo). Focus gets the
accent ring.

### Status pills

Pill, 1px border at 30% of the signal colour, washed background, the signal
colour as text — **and the word**. `verified` / `needs your eyes` /
`withheld` / `limit reached`.

## 7. The logo

`components/SayOnceLogo.tsx`, `public/logo.svg`, `public/favicon.svg`.

One solid origin dot fanning out 1 → 2 → 3 with opacity falling off by depth.
It *is* the product thesis as a mark: one voice becomes many.

- Draws in `currentColor` by default so it needs no dark variant.
- `tone="accent"` for the brand blue.
- `<SayOnceWordmark>` pairs it with "SayOnce" in Newsreader.
- `animated` staggers the fan on mount — use it **once**, in the landing hero.

**One logo in the product.** Do not draw a second mark, do not add a graphical
wordmark, do not recolour it per page.

## 8. Anti-patterns

From Parity's list, all of which apply:

- ❌ Emojis as icons — use **Lucide** SVG icons, one set, everywhere
- ❌ Missing `cursor-pointer` on a clickable element
- ❌ Layout-shifting hovers (scale transforms that move siblings)
- ❌ Low contrast text — 4.5:1 minimum
- ❌ Instant state changes — always 150–300ms
- ❌ Invisible focus states
- ❌ Excessive decoration, complex shadows, 3D effects
- ❌ Floating gradient blobs, aurora backgrounds, glassmorphism for mood
- ❌ Autoplaying motion under `prefers-reduced-motion`

SayOnce adds:

- ❌ **A number on screen that is not read from data.** See
  [`12-SECURITY-AND-PRIVACY.md`](12-SECURITY-AND-PRIVACY.md) and `lib/proof.ts`.
- ❌ **A tinted section background** to separate sections. Use a hairline and
  space.
- ❌ **Colour used decoratively.** It carries state only.

## 9. Pre-delivery checklist

Run this on every screen before calling it done:

- [ ] No emoji icons; all icons from Lucide
- [ ] `cursor-pointer` on every clickable element
- [ ] Every transition 150–300ms on `--ease`
- [ ] 4.5:1 text contrast in **both** themes
- [ ] Focus visible on every interactive element, tab order sane, no trap
- [ ] `prefers-reduced-motion` gives a complete static version
- [ ] 375 / 768 / 1024 / 1440 px — no horizontal scroll, no clipped content
- [ ] Nothing hidden behind the fixed header
- [ ] Empty, loading and error states all designed
- [ ] One primary action, unmistakable
- [ ] A Devanagari draft on screen renders in Noto Sans Devanagari
- [ ] Every number traces to data
