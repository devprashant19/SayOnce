# The landing page

Phase 7. The app moves to `/app`; `/` becomes the story.

**Goal:** tell the SayOnce story in about 30 seconds of scrolling, then hand off
into the live app with one seamless transition. It is the first thing a judge
opens from your link, and it is the only part of the entry that gets judged on
craft rather than correctness.

**Concept:** one voice becomes many.
**Headline:** *Say it once. Everyone gets their version.*

## The six scenes

Scroll-driven, pinned sections. **Not autoplay** — the visitor controls the pace,
which also means a judge who scrolls fast is never waiting.

### 1. Speak
A live waveform. A Hinglish sentence types itself. Filler words and repeated
words strike through and fade — which is itself a small argument for dictation.
Primary button *"Try it with your voice"* visible **without scrolling**.

### 2. Extract
The sentence breaks apart. Facts lift out as chips: a date, a quantity, a
person — and one fact wearing a padlock.

### 3. Route
Chips travel along curved SVG paths to five contact avatars. The locked fact
hits a shield in front of the vendor and bounces off.

### 4. Compose — **the signature moment**
Each avatar unfolds into a message card in its own language and script: English
email, Hindi in Devanagari on WhatsApp, Hinglish, Spanish. Text writes itself in.

This is the one place motion is allowed to be the point. Everything else is quiet.

### 5. Verify
Thin provenance lines draw from each sentence back to the spoken words. Check
marks tick on, one by one.

### 6. Trust
The Trust Trail slides past as a chain of linked entries with short hashes. The
Voice Return counter rolls up — words spoken against words delivered. The
Knowledge Matrix assembles cell by cell.

### Close
One line on who it is for (India first, anyone working across languages), the
main button again, and a quiet footer crediting the No Hands challenge.

## The interactive strip

Between scenes 4 and 5: **"Try it here."**

A textarea for a dictated sentence, plus three sample chips. The samples use
**cached results**, so they are instant and the page never waits on a model.
Custom input calls the live pipeline with a three-contact demo set, showing
skeleton cards while it runs.

This matters more than any animation: it is the first point at which a visitor
does something rather than watches something.

## The transition into the app

The final button morphs into the app's Speak box using a **shared-element page
transition** — the View Transitions API, with the same `view-transition-name` on
both pages. The base already sets `viewTransitionName: "speak-box"` on the
landing CTA; the Speak box needs the matching name.

Browsers without support get a quick cross-fade. It must **degrade cleanly in
Safari and Firefox**, not break.

The point of the transition is that the landing page and the app feel like one
surface rather than a brochure linking to a tool.

## Motion rules

- **One signature moment** (scene 4). Everything else quiet.
- **Every frame works as a still.** If a mid-animation frame looks wrong, the
  animation is wrong.
- **`prefers-reduced-motion` gets a complete, calm static version** with all the
  content. Not a degraded version — a different one that is just as good.
- **No layout shift.** Reserve space before content arrives.
- **Native cursor kept.** No custom cursors.
- Smooth on a mid-range phone; the first scene readable within a second.
- Lazy-load anything below scene 2.

## Honesty rules

**Real copy only.** No invented logos, no testimonials, no made-up metrics.

Numbers come from Phase 8's measurements. Until then every number on the page
is **labelled as a sample**, and Phase 8's job includes replacing each one with
the measured figure or keeping the label.

This is not only integrity — it is also the thing that would most damage
criterion 1 if a judge spotted it.

## Technical notes

- A scroll-animation library with timeline control and smooth scrolling. The
  agent picks one; the constraint is the performance budget, not the library.
- SVG for the paths and chips in scenes 2 and 3.
- 3D only if it clearly earns its place. It almost certainly does not.
- Open Graph image built from the hero, plus title, description and favicon —
  the link gets pasted into WhatsApp, and the preview is the first impression.

## Performance budget

| Metric | Budget |
| --- | --- |
| LCP | under 2.5 s on a throttled mid-range phone profile |
| Layout shift | none |
| Scroll | 60 fps on desktop |
| First scene readable | within 1 s |

Measure it. A landing page that misses this budget is worse than the plain one
it replaced.

## Accessibility

Semantic headings in order. Keyboard reachable. Visible focus. Contrast AA. Alt
text on every graphic that carries meaning. The scroll story must be readable
by someone who never scrolls — which is what the reduced-motion version is for.

## Acceptance criteria

- Works at 360 px, 768 px, 1440 px, and with reduced motion
- A first-time visitor can say what SayOnce does after one scroll (test it on
  someone)
- The transition into `/app` works in Chrome and degrades cleanly elsewhere
- The interactive strip passes five golden cases
- Every number is measured or labelled as a sample
- A jury-style review scores design at least 8 out of 10

## What to cut if the clock runs out

In this order — and cutting here is much cheaper than cutting a phase:

1. The Knowledge Matrix assembly in scene 6 (show it static)
2. The SVG path travel in scene 3 (fade the chips across instead)
3. The waveform in scene 1 (a static waveform image reads nearly as well)
4. Scene 6 entirely, folding the Trust Trail into the close

**Never cut:** the headline, scene 4, the interactive strip, the main button
above the fold, or the reduced-motion version.
