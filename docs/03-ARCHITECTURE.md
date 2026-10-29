# Architecture

## Decisions, and why

Each of these is settled. Changing one mid-build costs more than it saves.

| Decision | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15, App Router | Server routes are mandatory — the AI key and the Trust Trail hashing must be server-side — and one framework gives both pages and routes. Deploys from a local folder with one CLI command. |
| Language | TypeScript, `strict` plus `noUncheckedIndexedAccess` | The pipeline is four schema boundaries in a row. Types are what stop a routing bug becoming a wrong-recipient message. |
| Validation | Zod 4 | One schema per AI step, reused as the model's output format and as the runtime guard. Written once, enforced twice. |
| AI | Anthropic SDK, `claude-opus-5-5`, structured outputs | One fixed model for the whole build so accuracy scores stay comparable across phases. Structured output means no JSON parsing by hand. |
| Database | Neon serverless Postgres + Drizzle | Hosted, works from a serverless function, migrations are files. Needed from Phase 2. |
| Styling | Tailwind CSS v4 with CSS custom properties | Tokens live in one `@theme` block; the agent can move fast in Phase 6 without inventing a system. |
| Tests | Vitest | The deterministic core is pure functions. Fast tests on those are the whole safety net. |
| Hosting | Vercel CLI | `vercel deploy` from the folder, server routes, instant rollback by promoting a previous deployment, no git push required. |
| Voice | Wispr Flow, no SDK | Wispr types into the focused text box. A well-behaved textarea *is* the integration. The unofficial SDK patches the desktop app and could break or breach terms. |

## The pipeline

Five stages. Each phase adds or hardens one.

```
                   ┌──────────────────────────────────────────┐
  spoken text ───▶ │ EXTRACT   facts + privacy tags + spans   │  Phase 1
                   └──────────────────────┬───────────────────┘
                                          ▼
                   ┌──────────────────────────────────────────┐
                   │ ROUTE     who needs it, which facts, why │  Phase 2
                   └──────────────────────┬───────────────────┘
                                          ▼
                   ┌──────────────────────────────────────────┐
                   │ COMPOSE   one draft per contact,         │  Phase 1
                   │           given ONLY allowed facts       │
                   └──────────────────────┬───────────────────┘
                                          ▼
                   ┌──────────────────────────────────────────┐
                   │ VERIFY    (a) deterministic checker      │  Phase 1 / 4
                   │           (b) AI check                   │
                   │           fail ▶ regenerate once ▶ warn  │
                   └──────────────────────┬───────────────────┘
                                          ▼
                   ┌──────────────────────────────────────────┐
                   │ SEND & LOG  wa.me / mailto, Trust Trail  │  Phase 3 / 5
                   └──────────────────────────────────────────┘
```

Three properties of this shape matter more than the shape itself:

**Compose never sees a blocked fact.** The Privacy Shield is enforced by what
is passed in, not by asking the model to be careful. A model instructed not to
mention something still might; a model that was never told cannot.

**The deterministic checker has final authority.** `lib/checker.ts` contains no
model. When it fails a draft, the send button is disabled regardless of what the
AI verify layer concluded. The AI layer catches what arithmetic cannot — a
missing must-know fact, a claim smuggled in as phrasing, a tone that will land
badly — and never overrides the function.

**Every stage writes to the Trust Trail.** From Phase 1, not retrofitted later.
An audit log added after the fact has gaps exactly where the interesting things
happened.

## File map

```
sayonce/
├─ app/
│  ├─ page.tsx                 landing (Phase 1 plain → Phase 7 scroll story)
│  ├─ layout.tsx               shell, nav, skip link, metadata
│  ├─ globals.css              design tokens, one signature animation
│  ├─ app/page.tsx             Speak + results          Phase 1
│  ├─ people/page.tsx          People Book              Phase 2
│  ├─ log/page.tsx             Update Log               Phase 5
│  ├─ lab/page.tsx             Quality Lab              Phase 4
│  ├─ proof/page.tsx           real-use evidence        Phase 8
│  └─ api/
│     ├─ fanout/route.ts       the pipeline             Phase 1
│     ├─ health/route.ts       uptime + readiness
│     ├─ contacts/route.ts     People Book CRUD         Phase 2
│     ├─ parse-contact/route.ts voice contact entry     Phase 2
│     ├─ lab/route.ts          golden set runner        Phase 4
│     ├─ feedback/route.ts     voice feedback → profile Phase 5
│     └─ command/route.ts      voice command bar        Phase 6
├─ components/
│  ├─ SpeakBox.tsx             the entire Wispr integration
│  ├─ DraftCard.tsx            one card per reader, with verified/held state
│  ├─ FactList.tsx             what you said + facts found, with provenance
│  ├─ Badge.tsx                the only place colour means something
│  ├─ Placeholder.tsx          honest placeholder naming its phase
│  ├─ KnowledgeMatrix.tsx      facts × people grid      Phase 2
│  ├─ TrailTimeline.tsx        hash chain, Verify button Phase 4
│  └─ CommandBar.tsx           Ctrl/Cmd+K dictated commands Phase 6
├─ lib/
│  ├─ types.ts                 every schema, one file
│  ├─ env.ts                   server-only env access
│  ├─ checker.ts               ★ the deterministic verifier — final authority
│  ├─ trail.ts                 ★ hash chain, canonical JSON, Verify
│  ├─ links.ts                 ★ wa.me / mailto, round-trip decode
│  ├─ dates.ts                 relative date resolution (parso, kal, next Monday)
│  ├─ script.ts                Unicode script detection and language intent
│  ├─ scrub.ts                 OTP / card / ID masking before save or display
│  ├─ voice-return.ts          words spoken vs delivered vs minutes saved
│  ├─ contact-sets.ts          the two demo datasets
│  ├─ ai/
│  │  ├─ client.ts             one lazily-constructed Anthropic client
│  │  ├─ call.ts               the only way to call a model: schema + one retry
│  │  ├─ extract.ts / route.ts / compose.ts / verify.ts
│  │  └─ prompts/              the four step prompts, one file each
│  └─ db/
│     ├─ schema.ts             six tables + demo_usage
│     └─ index.ts              lazy Neon handle
├─ data/
│  ├─ demo/                    two contact sets + five sample updates
│  └─ golden/                  example set committed; real set never is
├─ tests/                      checker, trail, links, dates — 90 tests
├─ scripts/
│  ├─ quality-lab.mjs          run the golden set, print the metric table
│  ├─ audit-secrets.mjs        pre-deploy leak audit
│  └─ seed-demo.mjs            demo tables only
└─ docs/                        this folder; never deployed
```

★ marks the three modules that carry the product's promises. They are pure,
tested, and must not grow a model dependency.

## Why the deterministic core is separate

The accuracy claim is not "the AI says it checked". It is that a plain function
re-reads every draft against the facts and refuses anything it cannot account
for. That claim only holds if the function is:

- **pure** — no network, no model, no clock, so it is testable and fast
- **written once** — Phase 1 builds it, Phase 4's Verify step and the Quality
  Lab both import it unchanged, so three places cannot drift apart
- **final** — nothing downstream may override it except an explicit human
  override, which is itself logged in the trail

If a phase prompt tempts the agent to reimplement any of this inside a route
handler or a prompt, that is the bug.

## Serverless budget

Compose fans out in parallel, but a five-contact update on a cold start still
takes time. `maxDuration` is set deliberately on the route and must stay inside
the host's limit. If a fan-out of eight contacts starts timing out, batch the
Compose calls rather than raising the ceiling — a request that takes 90 seconds
is a bad demo even when it succeeds.

## Where each phase touches the architecture

| Phase | Adds | Hardens |
| --- | --- | --- |
| 1 | Extract, Compose, checker, Speak screen | — |
| 2 | Route, database, People Book, Knowledge Matrix | Replaces the Phase 1 "everyone gets everything" stand-in |
| 3 | Send layer, Send all queue | Channel rules enforced at Compose |
| 4 | AI Verify layer, provenance, Privacy panel, Trail UI, Quality Lab | The checker becomes a visible badge; blocked drafts disable sending |
| 5 | Update Log, voice feedback, Consistency Guard, commitments, Voice Return | Compose starts receiving learned rules and history |
| 6 | Demo mode, command bar, script toggle, design system | Every screen gets empty / loading / error states |
| 7 | Landing page, View Transitions handoff | — |
| D | Judge demo sessions, caps, kill switch, deployment | Demo tables fully isolated from real |
| 8 | `/proof` | Nothing new; only what real use breaks |
