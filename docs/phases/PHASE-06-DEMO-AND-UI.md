# Phase 6 — Demo mode, global readiness, command bar, UI pass

**Hours 28–32.** Earlier phases and the Quality Lab must keep passing.

**Goal:** judge-ready. Anyone can try it in one minute, it visibly works beyond
India, and the interface feels finished.

---

## 1. Demo mode

"Try a demo" on first visit, no login.

Two datasets, already in `data/demo/`:

| Set | Contacts | Languages |
| --- | --- | --- |
| **Indian team** | 5 | English, Hinglish, Hindi in Devanagari |
| **Global team** | 5 | English, Mexican Spanish, Brazilian Portuguese, Taglish |

Each with three sample spoken updates (five exist in `data/demo/updates.json`).

### Cached sample results — the load-bearing part

For each sample update in each dataset, store the **complete pipeline output**:
extracted facts with source spans, routing decisions with reasons, every draft,
every verify result, and the trail. Serve those when the text is unchanged from
the sample.

Two reasons this is not a shortcut:

1. **Instant.** A judge pressing Fan out and watching a twelve-second spinner has
   already formed an opinion.
2. **Cannot fail.** A rate limit, an outage or an expired key on judging day does
   not break the demo.

**Generate the cache from a real run**, not by hand, so what a judge sees is
genuinely what the pipeline produces. Check it in as a fixture and regenerate it
whenever a prompt changes.

Live AI runs **only** on text a judge types themselves.

### Isolation

Demo data isolated from real data, and resets daily. Phase D hardens this with
signed sessions and caps; here, get the dataset separation right.

## 2. Voice command bar

One input, **Ctrl/Cmd+K**, that takes dictated commands:

- "send everyone except Ramesh"
- "make the boss version shorter"
- "switch Priya's to Hindi"
- "show me what the vendor doesn't know"

The AI maps them to `{ action, targets, params }`. Then:

- **Confirm before any destructive action.** "Send everyone" gets a confirmation.
- Log each command in the trail as a `command` entry.
- An unrecognised command says so plainly rather than guessing. Acting on a
  misheard command is much worse than asking.

**Acceptance test:** ten test commands handled correctly.

Great on camera, and genuinely useful once there are more than three cards.

## 3. Script toggle

Hindi drafts switch between **Devanagari and Roman** script, for contacts who
read either. One button on the card; re-renders from the same facts rather than
transliterating the string.

## 4. Design system

Pick one style suited to a **calm, trustworthy productivity tool** — not a
consumer app.

Tokens for colour, type, spacing and radius; light and dark themes. The tokens
in `app/globals.css` are the starting point, not the final answer.

**Colour carries meaning only:** verified green, warning amber, blocked red,
locked grey, accent for the one action. Nothing else is coloured, and colour is
never the only signal.

## 5. UI pass over every screen

- One primary action per screen
- Clear **empty, loading and error** states everywhere
- **Skeletons instead of spinners** for AI steps — a skeleton says what is coming
- Language badges and channel icons on cards
- A three-step "how it works" strip on first visit
- The in-app signature motion: drafts fan out as cards after Fan out, respecting
  `prefers-reduced-motion`

Work screen by screen: `/`, `/app`, `/people`, `/log`, `/lab`, `/proof`.

## 6. Accessibility

WCAG 2.1 AA. Full list in [../rules/R3-UI-A11Y.md](../rules/R3-UI-A11Y.md).

- Everything keyboard reachable, visible focus, no trap
- Contrast AA in **both** themes
- Labels on all inputs; accessible names on icon buttons
- Touch targets 44 px minimum
- `lang` on a draft body that is not English

**Target: Lighthouse accessibility 95+.**

---

## The screenshot pass

Screenshot **every screen at three widths in both themes** — 360, 768, 1440 ×
light, dark. That is twelve shots per screen state; do the states that matter
(empty, loaded, error).

Review each against the design system and the UI checklist. List every issue,
fix, re-screenshot.

Specifically check:

- [ ] A Devanagari draft renders in `Noto Sans Devanagari`, not a fallback
- [ ] The Knowledge Matrix is usable at 360 px (sticky first column, horizontal
      scroll)
- [ ] A long Spanish draft does not break the card layout
- [ ] Nothing shifts when the drafts arrive

---

## Acceptance criteria

- [ ] A **new visitor completes a demo fan-out within 60 seconds with no
      instructions** — test this on an actual friend
- [ ] Global demo cases pass the same accuracy targets as the Indian ones
- [ ] The command bar handles ten test commands correctly
- [ ] Usable at 360 px, 768 px and 1440 px
- [ ] **Lighthouse accessibility 95+**
- [ ] Sample updates fan out **instantly**, with zero AI calls
- [ ] `npm run lab` — the full set, every target still met

The friend test is the real one. If they ask a question, that question is the
bug — fix the screen, not the friend.

## Cut line

- The **voice command bar** — great on camera, not load-bearing
- The **script toggle**
- The "how it works" strip can be one line of text rather than three steps
- The design pass can stop at the three screens a judge will actually see:
  `/`, `/app`, `/lab`

**Do not cut:** the cached sample results, or the accessibility pass. The first
is load-bearing for judging; the second is a published criterion and cheap to
hold once started.

## Gate

Full [standard gate](PHASE-GATE.md), plus:

- [ ] The before/after screenshot list
- [ ] The Lighthouse accessibility score
- [ ] The command bar test table (if not cut)
- [ ] Full lab results
- [ ] The friend test result, with whatever they asked about
