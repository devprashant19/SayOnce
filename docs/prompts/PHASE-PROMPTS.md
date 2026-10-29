# Phase prompts

One per phase. Each assumes [the context block](00-CONTEXT-BLOCK.md) is already
in front of the agent, and each ends with a find-and-fix loop so the agent tests
its own work before reporting.

**Dictate these rather than pasting them.** Read each aloud through Wispr,
adding your real names and projects as you go. That keeps the prompt yours and
builds your usage count. Text in `[square brackets]` is yours to fill in.

After each one, run the [gate review](REUSABLE-PROMPTS.md) in a separate
reviewer session, and feed failures back with the find-and-fix prompt.

---

## Phase 0 — Spec, golden set, idea review

For your **planning** agent. No app code.

```
TASK: Phase 0 of SayOnce. Produce SPEC.md and the golden set. No app code.

STEP 1, INTERVIEW ME. Ask one question at a time until you can fill every
section below with confidence. Push back if my problem sounds vague or invented.
Cover: my role; the 5 to 10 people I update most, with role, language, channel,
formality, what they care about, and anything they must never be told; three
real updates I sent last week and how I rewrote each one for different people;
how long one update currently takes me.

STEP 2, WRITE SPEC.md with these sections:
 1. The problem in my words, and the measurable before-state: minutes per
    update, rewrites per update.
 2. Users: me first, then the global user.
 3. Contacts, anonymised: "Contact A = packaging vendor, Hinglish, WhatsApp,
    cares about quantities and dates, never tell about pricing".
 4. Pipeline: Extract, Route, Compose, Verify, Send and Log, with the input and
    output schema of each AI step as JSON.
 5. Data model: contacts, updates, facts, messages, trail_entries, commitments.
 6. Standout features: Knowledge Matrix, fact provenance, Privacy Shield, Trust
    Trail, Quality Lab, Consistency Guard, Voice Return meter. One paragraph
    each with acceptance criteria.
 7. Accuracy targets, copied from docs/07-ACCURACY-SYSTEM.md.
 8. Out of scope.
 9. Changelog.

STEP 3, GOLDEN SET. Write the cases as JSON matching the GoldenCase schema in
lib/types.ts: id, group, spokenText, spokenOn, contactSet, expectedRecipients,
mustKnow, blocked, expectedLanguage, notes. Groups: 10 from my real updates;
8 Hinglish edge cases (numbers said in Hindi like "dhai sau", relative dates
like "parso", English words written in Devanagari, mixed honorifics); 7 tricky
instructions ("don't tell the vendor", "boss only", mid-sentence corrections
like "Tuesday, no wait, Wednesday", negations, an update that concerns nobody);
5 global (Spanish-English, Taglish or similar); 4 adversarial. I will dictate
spokenText for each; you draft the expectations and I correct them. Start from
data/golden/golden-set.example.json.

STEP 4, REVIEW THE IDEA. Act as a harsh hackathon judge. Score the idea out of
10 on the four judging criteria using SPEC.md. Name its single weakest point and
how to fix it before building.

FIND AND FIX: Check SPEC.md for contradictions, missing schemas, untestable
criteria, and golden cases whose expectations conflict with the spec or with
each other — in particular any fact that is in both mustKnow and blocked for the
same contact. List every issue, fix it, re-check.

REPORT: SPEC.md, the golden set file, the idea scores, and open questions for me.
```

---

## Phase 1 — Verify the core pipeline against my data

The pipeline is already built. This is verification, not construction.

```
TASK: Phase 1 of SayOnce. The core pipeline is already built and tested in this
repo. Verify it against MY golden set and fix what fails. Read
docs/phases/PHASE-01-CORE-PIPELINE.md first.

STEP 1: Run `npm run verify:all` and show me the output. Then start the dev
server and run `npm run lab -- --group real`.

STEP 2: For every failing real case, produce a table: case id, expected versus
actual, the checker's result, and the layer at fault — Extract prompt, Compose
prompt, schema, date logic, or the checker itself.

STEP 3: Fix at that layer with the smallest change that solves it. Do not
refactor. Do not reimplement lib/checker.ts, lib/trail.ts or lib/links.ts — they
are tested; import them.

STEP 4: If you change the checker, add a unit test in the same change that fails
without your fix.

ACCEPTANCE CRITERIA:
 - Spoken text with 3 to 6 facts produces facts with correct source spans.
 - Every number, date and name in every draft appears in the facts given to that
   contact, confirmed by the checker.
 - A blocked fact never appears in a blocked contact's input or output.
 - Relative dates resolve correctly against spokenOn; mid-sentence corrections
   apply and keep only the corrected version.
 - Works at 360 px.

FIND AND FIX: Re-run all ten real cases after each fix, then run the full set.
Repeat until 10 of 10 real cases pass with zero invented facts, or you hit
something you need a decision from me on.

REPORT: files changed, the 10/10 evidence table, the full-set baseline including
metrics that are below target, and the known weaknesses.
```

---

## Phase 2 — People Book, routing, Knowledge Matrix

```
TASK: Phase 2 of SayOnce. Real contacts, automatic routing, and the Knowledge
Matrix. Phase 1 must keep passing. Read docs/phases/PHASE-02-PEOPLE-BOOK-ROUTING.md.

BUILD:
 1. DATABASE. Neon Postgres. Run the generated migrations from lib/db/schema.ts,
    then write the hand-written append-only migration for trail_entries that
    drizzle.README.md describes. Persist contacts, updates, facts and messages.
    Seed demo contacts separately from my real ones; a demo/real toggle switches
    datasets. Every row carries the dataset column.
 2. PEOPLE BOOK at /people: list, add, edit, archive. Fields: name, role,
    relationship, language as FREE TEXT — never a dropdown — channel, phone in
    E.164 with validation, email with validation, formality, cares_about,
    never_tell. Phone required for whatsapp, email required for email, said at
    the field rather than on submit.
 3. VOICE CONTACT ENTRY: one textarea at the top. I dictate "Ramesh, our
    packaging vendor, speaks Hinglish, WhatsApp, plus nine one nine zero zero
    zero zero zero zero zero zero one, only cares about quantities and dates,
    never tell him about pricing". The AI fills the form using the ParsedContact
    schema; I review and save. Unclear fields are highlighted, NEVER guessed —
    no invented phone numbers or emails.
 4. ROUTE STEP: a new AI call between Extract and Compose, using the prompt
    already in lib/ai/prompts/route.ts and the RouteResult schema. Replace the
    block labelled phase1-all-contacts in app/api/fanout/route.ts, and keep the
    privacy filter that follows it. Show recipients with reason, confidence and
    checkboxes; confidence below 0.6 shown unticked with a "check this" tag; an
    update that concerns nobody says so instead of showing an empty list.
 5. KNOWLEDGE MATRIX: a grid of facts by recipients. Cell states: told,
    deliberately not told with a lock icon and the reason, not relevant. Updates
    live when I tick or untick. Click a cell to see which sentence of which
    draft carries that fact. At 360 px use horizontal scroll with a sticky first
    column.

ACCEPTANCE CRITERIA:
 - Voice entry fills all fields correctly for five descriptions I dictate, with
   no invented phone numbers or emails.
 - Routing recall 90% or more and precision 85% or more on the golden set;
   privacy 100%.
 - The matrix matches the drafts exactly: every told cell has a carrying
   sentence, and no fact appears in a draft its cell says is untold.
 - Phase 1's checker still shows zero invented facts on all cases.

FIND AND FIX: Run all golden cases. Produce a table: case, routing precision and
recall, privacy pass, invented facts, matrix consistency. Investigate every
failure, classify the cause, fix, re-run EVERYTHING — not just the failures.
Also test: a contact with no phone; two contacts with the same first name; an
update that concerns nobody; a never_tell topic the speaker did not flag.

REPORT: files changed, the full-set table before and after, and open issues.
```

---

## Phase 3 — Send layer

```
TASK: Phase 3 of SayOnce. One tap from draft to sent, on desktop and phone.
Earlier phases must keep passing. Read docs/phases/PHASE-03-SEND-LAYER.md.
lib/links.ts is already built with 33 round-trip tests — import it, do not
rewrite it.

BUILD:
 1. A dev-only send-test page listing twelve tricky bodies: Devanagari, very
    long text, special characters, emoji, an empty subject, mixed scripts, a
    number with a plus. For each, generate both links, decode them back with
    decodeSendLink, and compare byte for byte. Show pass or fail. Make sure it
    is not in the production build.
 2. "Mark as sent" on each card, auto-set when a send button is used and
    editable, persisting to messages.sent and writing a sent entry to the trail.
 3. "Send all" as a guided queue: one card at a time, a Next button, progress
    like "2 of 5". Not a burst of window.open calls — browsers block those.
 4. Confirm the channel rules hold in practice: WhatsApp bodies under 700
    characters with no markdown symbols, email subjects under 70 characters and
    never empty.

ACCEPTANCE CRITERIA:
 - Hindi in Devanagari, Hinglish, emoji, line breaks, ampersands, hash and
   question marks all survive the round trip into WhatsApp and the mail app with
   no broken characters and no truncation.
 - Phone numbers from three countries open the right chat.
 - Works on Android Chrome, iOS Safari and desktop Chrome.
 - A contact with no phone shows a reason, not a dead button.

FIND AND FIX: Run the twelve-case round trip and fix every mismatch. Then I will
test ten real sends to my own number; I will dictate the results and you fix
what I report.

REPORT: files changed, the twelve-case round-trip table, the device test results,
and open issues.
```

---

## Phase 4 — Verify, provenance, Privacy Shield, Trust Trail, Quality Lab

The phase that wins the accuracy argument. Consider splitting it across two
sessions: Verify and provenance first, then Trust Trail and Quality Lab.

```
TASK: Phase 4 of SayOnce. Make the app check its own work, visibly, and keep a
tamper-evident record. Earlier phases must keep passing. Read
docs/phases/PHASE-04-VERIFY-AND-LAB.md.

lib/checker.ts and lib/trail.ts are already built and tested. Import them. Do
not reimplement any of their logic in a route handler or a prompt.

BUILD:
 1. VERIFY STEP, two layers, in this order.
    (a) The deterministic checker, already built — wire it as the gate.
    (b) An AI check using VERIFY_SYSTEM and the VerifyAiResult schema, already
        written, returning missing must-know facts, added claims, a tone score
        and issues.
    If either fails: regenerate that draft ONCE with the issues listed. If it
    still fails, show the card with a red panel listing exactly what is wrong
    and DISABLE its send button until I edit or override. An override is logged
    in the trail. Each passing card shows the "Facts verified" badge with a
    tooltip of the checks run. If the two layers disagree, the checker wins.
 2. FACT PROVENANCE both ways: hovering or tapping a sentence highlights the
    source spans of its facts in the original text, and hovering a span
    highlights the sentences carrying it. Works on touch, not only hover.
    Keyboard reachable. A sentence carrying no fact highlights nothing.
 3. PRIVACY SHIELD: a panel listing every lock and who it protects against, in
    my own words rather than a paraphrase. A blocked draft shown with the
    leaking phrase struck through in red, using the evidence string the checker
    returns. Instrument the Compose prompt input and assert that no blocked fact
    ever appears in it.
 4. TRUST TRAIL: persist to trail_entries, append-only in the application and
    the database. A per-update timeline with expandable entries and a "Verify
    trail" button that recomputes the chain and shows green, or red at the first
    broken link. Export the trail as JSON.
 5. OUTPUT SCRUB: confirm lib/scrub.ts runs before anything is displayed, saved
    or logged, and that the trail records THAT masking happened, not what was
    masked.
 6. QUALITY LAB page at /lab: stores the golden set; "Run all" sends every case
    through the LIVE pipeline — the same code path as the app — and grades each
    with the deterministic checks plus the AI grader at the fixed
    SAYONCE_GRADER_EFFORT. A table per metric with pass or fail per case,
    overall scores against targets, and a history of runs. Record the model and
    grader effort with each run. It must be readable by a non-technical person.
 7. Wire the four adversarial golden cases into the lab.

ACCEPTANCE CRITERIA:
 - All accuracy targets met on all cases in the Quality Lab.
 - A deliberately planted invented fact and a planted leak are both caught.
 - Editing a trail row directly in the database makes "Verify trail" turn red at
   that row. Test this; it is what makes the badge mean something.
 - Provenance highlights are correct for every sentence in five sampled drafts.
 - A failed draft's send button is disabled, and an override is logged.
 - The regeneration loop runs once, not repeatedly.

FIND AND FIX: Run the Quality Lab. For every failing case write the root cause
in one line, fix at the right layer — prompt, schema, checker, routing — and
re-run the FULL lab, not just the failures. Also try to break it: a very long
update; two contradictory statements with no correction cue; a contact named like
a fact such as "Friday"; an update entirely in Devanagari; an update with no
facts at all; a fact blocked for everyone. Repeat until all targets pass.

REPORT: files changed, the Quality Lab table before and after, the adversarial
results, the trail tamper test result with the row number it broke at, and open
issues.
```

---

## Phase 5 — Update Log, learning, Consistency Guard, commitments, Voice Return

```
TASK: Phase 5 of SayOnce. Memory: the record that writes itself, drafts that
improve with use, and protection against contradicting myself. Earlier phases
and the Quality Lab must keep passing. Read docs/phases/PHASE-05-LOG-AND-MEMORY.md.

BUILD:
 1. UPDATE LOG at /log: every update with date, project, a one-line summary,
    decisions, recipients, sent status per message, and a link to its Trust
    Trail. Filter by person, project and date; search; CSV export. Make it look
    like a record — dense and scannable, newest first — not a feed of cards.
 2. VOICE FEEDBACK: under each card, a textarea, "Tell SayOnce what was wrong".
    I dictate "too formal for Ramesh, he hates long messages" and the AI turns
    it into a proposed profile change — formality casual, learned rules like
    "keep to three lines" and "no greetings" — which I accept or reject.
    Accepted changes are versioned on the contact and recorded in the trail as a
    profile-change entry; rejections are logged too. Future drafts for that
    contact use the updated profile; composeUser already accepts learnedRules.
 3. CONSISTENCY GUARD: before showing drafts, compare the new facts with facts
    previously sent to each recipient on the same project in the last 30 days.
    If a date, quantity, price or decision changed, show "Last Tuesday you told
    Ramesh delivery is Friday; this says Monday" with three options: add a
    correction line built only from those two facts, ignore, or mark the earlier
    fact superseded. Log the choice in the trail.
 4. COMMITMENTS: Extract already tags commitment facts. Store them with owner,
    due date and status. A Commitments view lists open items; for items others
    owe me, one click drafts a polite follow-up in their language and channel,
    reusing Compose with the commitment as the fact.
 5. VOICE RETURN METER: lib/voice-return.ts is built. Wire it up per update on
    the results screen and per week as a card. Instrument
    updates.elapsed_seconds — measured from opening Speak to the last send. Show
    minutes saved only when both the baseline and the elapsed time exist; never
    as a guess, never negative.
 6. "WHO DID I FORGET?": if a contact usually receives updates for this project,
    3 of the last 5, but is not selected, show a gentle warning beside the
    recipient list naming them and that fact. A nudge, not a modal.

ACCEPTANCE CRITERIA:
 - After five accepted feedback rounds on one contact, new drafts for that
   contact follow EVERY accepted rule. Test with three fresh updates.
 - Consistency Guard catches 5 of 5 planted contradictions and raises NO false
   alarm on 5 consistent follow-ups. The second half matters more than the first.
 - Commitments extracted correctly from five test updates with the right owner
   and due date.
 - Voice Return numbers match a hand calculation for three updates.
 - Every sent message has a trail entry; the log and the trail agree.
 - The Quality Lab still meets every target.

FIND AND FIX: Write the planted-contradiction and commitment cases into the
golden set as a new group — the contradiction cases need an earlier update
seeded into the log, so make that setup part of the case. Run the full lab, fix
every failure at its root, re-run everything. Repeat until clean.

REPORT: files changed, the new group's results, full lab results, the three fresh
drafts from the feedback test with the accepted rules listed beside them, and
open issues.
```

---

## Phase 6 — Demo mode, global readiness, command bar, UI pass

```
TASK: Phase 6 of SayOnce. Make it judge-ready: anyone can try it in one minute,
it visibly works beyond India, and the interface feels finished. Earlier phases
and the Quality Lab must keep passing. Read docs/phases/PHASE-06-DEMO-AND-UI.md.

BUILD:
 1. DEMO MODE: "Try a demo" on first visit, no login. Two datasets, already in
    data/demo: Indian team with Hinglish, Hindi in Devanagari and English, and
    Global team with Spanish, Portuguese, Taglish and English. Three sample
    spoken updates each. Demo data isolated from real data, resetting daily.
    CACHE the AI results for every sample update — facts with source spans,
    routing with reasons, drafts, verify results, trail — so the demo is instant
    and never fails. Generate the cache from a real run, not by hand, and check
    it in as a fixture. Live AI runs only on new input.
 2. VOICE COMMAND BAR: one input on Ctrl or Cmd plus K that takes dictated
    commands: "send everyone except Ramesh", "make the boss version shorter",
    "switch Priya's to Hindi", "show me what the vendor doesn't know". The AI
    maps them to JSON with an action, targets and params. Confirm before any
    destructive action. Log each in the trail. An unrecognised command says so
    plainly rather than guessing.
 3. SCRIPT TOGGLE: Hindi drafts switch between Devanagari and Roman script,
    re-rendering from the same facts rather than transliterating the string.
 4. DESIGN SYSTEM: pick one style suited to a calm, trustworthy productivity
    tool. Tokens for colour, type, spacing and radius; light and dark themes.
    The tokens in app/globals.css are the starting point. Colour carries meaning
    only: verified green, warning amber, blocked red, locked grey, accent for the
    one action — and colour is never the only signal.
 5. UI PASS over every screen: one primary action per screen; clear empty,
    loading and error states; skeletons instead of spinners for AI steps;
    language badges and channel icons on cards; a three-step "how it works"
    strip on first visit; the signature motion of drafts fanning out, respecting
    prefers-reduced-motion.
 6. ACCESSIBILITY: everything keyboard reachable, visible focus, contrast AA in
    both themes, labels on all inputs, accessible names on icon buttons, touch
    targets 44 px or more, and lang set on a draft body that is not English.

ACCEPTANCE CRITERIA:
 - A new visitor completes a demo fan-out within 60 seconds with no
   instructions. I will test this with a friend.
 - Global demo cases pass the same accuracy targets as the Indian ones.
 - The command bar handles ten test commands correctly.
 - Usable at 360 px, 768 px and 1440 px. Lighthouse accessibility 95 or more.
 - Sample updates fan out instantly, with zero AI calls.

FIND AND FIX: Screenshot every screen at three widths and in both themes, in its
empty, loaded and error states. Review each against the design system and the UI
checklist — empty, loading, error, focus, contrast, tap targets. Check
specifically that a Devanagari draft renders in Noto Sans Devanagari and not a
fallback, that the Knowledge Matrix is usable at 360 px, and that a long Spanish
draft does not break the card layout. List every issue, fix, re-screenshot.
Re-run the Quality Lab. Repeat until clean.

REPORT: files changed, the before and after screenshot list, the accessibility
score, the command bar test table, lab results, and open issues.
```

---

## Phase 7 — Animated landing page

```
TASK: Phase 7 of SayOnce. Build the landing page at / — the app is already at
/app. It must tell the story in about 30 seconds of scrolling, feel
award-calibre, and hand off into the app with one seamless transition. The app
and the Quality Lab must keep working. Read docs/14-LANDING-PAGE.md and
docs/phases/PHASE-07-LANDING-PAGE.md.

CONCEPT: one voice becomes many. Headline: "Say it once. Everyone gets their
version." Real copy only — no fake logos, testimonials or metrics. Every number
is either measured or labelled "sample".

SCENES, scroll-driven and pinned, not autoplay:
 1. SPEAK: a live waveform; a Hinglish sentence types itself; filler words and
    repeated words strike through and fade. The primary button "Try it with your
    voice" visible without scrolling.
 2. EXTRACT: the sentence breaks apart; facts lift out as chips — a date, a
    quantity, a person, and one wearing a padlock.
 3. ROUTE: chips travel along curved SVG paths to five contact avatars; the
    locked fact hits a shield in front of the vendor and bounces off.
 4. COMPOSE, the signature moment: each avatar unfolds into a message card in
    its own language and script — English email, Hindi in Devanagari on
    WhatsApp, Hinglish, Spanish — with the text writing itself in.
 5. VERIFY: provenance lines draw from each sentence back to the spoken words;
    check marks tick on in sequence.
 6. TRUST: the Trust Trail slides past as linked entries with short hashes; the
    Voice Return counter rolls up; the Knowledge Matrix assembles cell by cell.
CLOSE: one line on who it is for, the main button again, and a quiet footer
crediting the No Hands challenge.

INTERACTIVE STRIP between scenes 4 and 5, "Try it here": a textarea for a
dictated sentence plus three sample chips. Samples use cached results and are
instant; custom input calls the live pipeline with a three-contact demo set,
showing skeleton cards while it runs.

TRANSITION: the final button morphs into the app's Speak box using the View
Transitions API with the same view-transition-name on both pages. The landing
CTA already carries viewTransitionName "speak-box"; add the matching name to
components/SpeakBox.tsx. Fall back to a cross-fade where unsupported.

MOTION AND QUALITY RULES:
 - A scroll-animation library with timeline control and smooth scrolling, your
   choice; SVG for the paths; 3D only if it clearly earns its place.
 - One signature moment; everything else quiet. Every frame should work as a
   still.
 - prefers-reduced-motion gets a complete, calm static version with all the
   content.
 - LCP under 2.5 seconds and no layout shift on a throttled mid-range phone
   profile; 60 fps scroll on desktop; lazy-load anything below scene 2.
 - Semantic headings, keyboard reachable, visible focus, contrast AA, alt text,
   native cursor kept.
 - Title, description, an Open Graph image built from the hero, and a favicon.

ACCEPTANCE CRITERIA:
 - Works at 360 px, 768 px, 1440 px and with reduced motion.
 - A first-time visitor can say what SayOnce does after one scroll. I will test.
 - The transition into /app works in Chrome and degrades cleanly in Safari and
   Firefox.
 - The interactive strip passes five golden cases.

FIND AND FIX: Record screenshots at each scene at three widths, plus reduced
motion, plus a mid-transition frame. Measure LCP and layout shift on a throttled
phone profile. Run an accessibility audit. Then review as an awards jury with a
fresh critic: score design, usability, creativity and content out of 10 with
evidence. Fix the top issues, re-measure, and repeat until every score is 8 or
more and the performance budgets hold.

If the clock runs short, degrade scenes in this order: the Knowledge Matrix
assembly, the SVG path travel, the waveform, then scene 6 entirely. Never cut
the headline, scene 4, the interactive strip, the button above the fold, or the
reduced-motion version.

REPORT: files changed, the screenshot list, the performance numbers, jury scores
before and after, and open issues.
```

---

## Phase D — Judge demo and deployment

Run after Phase 7, before Phase 8's real use.

```
TASK: Make SayOnce usable by any judge in one click, then deploy it to a public
link from my local folder without pushing to git. Earlier phases and the Quality
Lab must keep passing. Read docs/phases/PHASE-D-JUDGE-DEMO-DEPLOY.md,
docs/10-JUDGE-DEMO.md and docs/11-DEPLOYMENT.md.

PART A, JUDGE DEMO:
 1. Route /demo, and ?demo=1 on any app URL, opens the app in demo mode with the
    Speak box pre-filled with a sample Hinglish update and a banner: "Demo mode.
    Press Fan out, or replace the text with your own." The Judge demo button is
    already in the layout; wire it.
 2. Each visitor gets an isolated demo session: a session id signed with
    DEMO_SESSION_SECRET, stored in the browser, with demo rows scoped by it and
    expiry after 24 hours. Demo mode can NEVER read real contacts or real
    updates — there must be no query path from demo mode to dataset 'real'.
 3. Dataset picker: Indian team, Global team. Every sample update has
    precomputed cached results for all steps, so the guided path never calls the
    AI. Confirm the cache matches the current prompts.
 4. A guided tour, five skippable steps, one tooltip each with a Next button:
    Fan out, Knowledge Matrix, provenance hover, a Privacy Shield block, Verify
    trail.
 5. Send buttons point at placeholder numbers and addresses in demo mode, with a
    note explaining why.
 6. "Reset demo" restores the starting state for that session.
 7. Live AI for custom text with per-session and daily caps from env vars, a
    DEMO_LIVE_AI kill switch, and a friendly limit message that offers the
    cached samples.
 8. Read-only links to /proof and the latest Quality Lab run.

PART B, DEPLOYMENT to Vercel:
 1. Pre-flight: `npm run verify:all`, `npm run lab`, `npm run audit:secrets`.
    Fix anything failing first.
 2. List every environment variable with its purpose, and confirm none are in
    the client bundle — search the built output for key prefixes.
 3. Database: run the migrations including the append-only trail migration, seed
    demo tables only, keep real-use rows separate.
 4. Check .vercelignore, then SHOW ME the file list the CLI will upload and wait
    for my OK. SPEC.md, the golden set, .env files, ROLLBACK.md, docs/,
    CLAUDE.md, AGENTS.md and .claude/ must not appear.
 5. Deploy a preview, run the smoke test against the PREVIEW url, fix and
    redeploy until clean.
 6. Promote to production, warm the caches by requesting /, /demo, /proof and
    each sample, and record the deployment id.
 7. Write ROLLBACK.md — local only, never uploaded — with the one command that
    promotes the previous deployment and the list of deployment ids.
 8. Set up an uptime check on /, /demo and /proof, and enable error logging.

SMOKE TEST, automate what you can with a browser script and leave the rest as a
checklist for me: landing loads and animates; the reduced-motion version works;
the transition into the app; /demo fan-out is instant; Knowledge Matrix;
provenance hover; a Privacy Shield block; WhatsApp and email links; Verify trail
green; Reset demo; live AI on custom text; the limit message past the cap;
/proof shows no personal data; the Open Graph preview — all at 360 px and
1440 px, with no login prompt anywhere.

FIND AND FIX: Run the smoke test on the preview and on production. Simulate 20
concurrent demo sessions and check isolation — no session sees another's edits —
and that the caps hold. Search the deployed site and its source maps for
secrets, phone numbers and emails. List every issue, fix, redeploy, re-test
until clean.

REPORT: the judge demo URL, the production URL, the deployment id, the
environment variable list with NAMES ONLY, the smoke test results, the load test
results, and open issues.
```

---

## Phase 8 — Real use, proof, demo and submission

```
TASK: Phase 8 of SayOnce. Turn real use into evidence, then prepare the
submission. DO NOT ADD FEATURES. Fix only what real use breaks. Read
docs/phases/PHASE-08-PROOF-AND-SUBMISSION.md.

BUILD:
 1. EVIDENCE DASHBOARD at /proof, linked from the landing page footer. From the
    real dataset: updates sent, messages delivered, languages used, average
    minutes per update before — the baseline from SPEC.md — and after, measured
    automatically from opening Speak to the last send, plus the latest Quality
    Lab scores and the Trust Trail verification status. Pass everything through
    anonymise(): no name, no phone number, no email address anywhere on it. If a
    figure has no data behind it, say so rather than showing a zero.
 2. Replace every "sample" number on the landing page with the measured one, or
    keep the label. There is no third option.
 3. Prepare a demo-ready state: a clean demo dataset, cached samples warm, and a
    fresh real update ready for me to dictate on camera.
 4. Draft three things for me to edit by voice:
    - the submission write-up: the problem, who it is for, how Wispr was used,
      and the results with real numbers
    - the README: what it is, how to run it, how accuracy is checked. No
      secrets, no golden set.
    - a two-minute demo script with timestamps, following
      docs/15-DEMO-SCRIPT-AND-SUBMISSION.md.

ACCEPTANCE CRITERIA:
 - Every number in the write-up, on the landing page and on /proof traces to
   real stored data.
 - A private-window visitor can open the public link, try the demo, and reach
   /proof without logging in.
 - No secrets, SPEC.md, golden set or agent instruction files in anything public.

FIND AND FIX: Do a full pre-submission audit. Click every link and button on
landing, the app, /demo and /proof at three widths. Run the Quality Lab. Verify
the trail. Scan the public build and its source maps for keys, phone numbers,
emails and private files. Check the Open Graph preview by pasting the link into
WhatsApp. List every issue, fix, re-audit until clean.

One honesty note for the write-up: the two-day deadline compresses real use from
two days to a few hours. Say the real figure. A measured half-day beats a
claimed two days.

REPORT: the audit checklist with pass and fail, the final numbers, and the drafts
of the write-up, README and demo script.
```
