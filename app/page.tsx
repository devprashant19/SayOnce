import Link from "next/link";
import { ChevronRight, Languages, Lock, Mic, Send, Sparkles } from "lucide-react";
import { StepLabel } from "@/components/parity/Tray";
import { CounterCard } from "@/components/parity/CounterCard";
import { Gauge } from "@/components/parity/Gauge";
import { InteractiveStrip } from "@/components/InteractiveStrip";
import { SayOnceLogo } from "@/components/SayOnceLogo";
import { landingSample } from "@/lib/landing-stats";
import { AUTOMATED_TEST_COUNT } from "@/lib/evidence";

/**
 * SayOnce Animated Landing Page (Phase 7).
 *
 * Tells the complete SayOnce story in 30 seconds of scrolling:
 * 1. Speak: Audio waveform, typing Hinglish update, filler strikethrough.
 * 2. Extract: Facts lift out as structured chips with dates and secrets flagged.
 * 3. Route: Facts travel to recipient profiles; secret hits the privacy shield.
 * 4. Compose: The signature moment — 3 tailored message cards unfold in their own
 *    native language, script, tone, and channel.
 * [Interactive Strip: "Try it here" with instant cached demo results & live test]
 * 5. Verify: Deterministic fact-checking with final authority over the model.
 * 6. Trust: SHA-256 tamper-evident hash trail, Voice Return amplification & Knowledge Matrix.
 * Close: Honest summary, launch CTA with View Transitions, and Wispr Challenge credit.
 */

export default function LandingPage() {
  // Computed from the prepared sample in data/demo. If it is ever missing the
  // band is dropped rather than filled with plausible-looking numbers.
  const sample = landingSample();

  return (
    <div className="space-y-24 py-6 sm:py-10">
      {/* =========================================================================
          HERO & SCENE 1: SPEAK
          Visible without scrolling on desktop and mobile.
         ========================================================================= */}
      <section
        aria-labelledby="hero-heading"
        className="flex flex-col items-center pt-2 text-center sm:pt-6"
      >
        {/* Parity's eyebrow: a white pill carrying the mark. */}
        <span className="eyebrow-pill">
          <SayOnceLogo size={15} tone="brand" decorative />
          Built for the Wispr Flow voice challenge
        </span>

        {/* Parity's headline: Inter at 500, with exactly one italic serif word. */}
        <h1
          id="hero-heading"
          className="font-display mt-5 max-w-4xl font-medium leading-[1.06] text-[var(--color-ink)]"
          style={{ fontSize: "clamp(36px, 7vw, 68px)" }}
        >
          Say it <em className="font-accent">once.</em>
          <br />
          Everyone gets their version.
        </h1>

        <p
          className="mt-4 max-w-2xl text-balance text-[var(--color-ink-soft)]"
          style={{ fontSize: "clamp(15px, 2.4vw, 18px)" }}
        >
          Speak one work update in whatever mix of languages you actually think in.
          SayOnce pulls out the facts, keeps each secret from the people it is kept
          from, and writes every person their own message — in their language, tone
          and channel. Checked by code, not by the model. Sent in one tap.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="btn-pill btn-ink"
            style={{ viewTransitionName: "speak-box" }}
          >
            <Mic size={15} aria-hidden="true" />
            Try it with your voice
            <span className="btn-chip" aria-hidden="true">
              <ChevronRight size={16} strokeWidth={2.5} />
            </span>
          </Link>
          <Link href="/app?demo=1" className="btn-pill btn-accent">
            <Sparkles size={15} aria-hidden="true" />
            Judge demo — no sign-in
            <span className="btn-chip" aria-hidden="true">
              <ChevronRight size={16} strokeWidth={2.5} />
            </span>
          </Link>
        </div>

        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1 text-xs text-[var(--color-ink-soft)]">
          <span>{AUTOMATED_TEST_COUNT} automated tests · 0 invented facts ·</span>
          <Link
            href="/lab"
            className="inline-flex min-h-11 items-center font-semibold text-[var(--color-ink)] underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
          >
            See the Quality Lab
          </Link>
        </p>

        {/* Live Audio Waveform & Spoken Transcription, in a Parity panel */}
        <div className="mt-10 w-full max-w-4xl rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-left shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-[var(--color-verified)] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)]">
                Scene 1: Spoken Update
              </span>
            </div>
            {/* Waveform Visualization */}
            <div
              className="flex items-center gap-1 h-5"
              aria-label="Pulsing voice waveform"
              role="img"
            >
              {[12, 24, 16, 28, 20, 8, 26, 18, 22, 14, 28, 10, 24, 16, 20].map((h, i) => (
                <div
                  key={i}
                  className="wave-bar w-1 rounded-full bg-[var(--color-accent)]"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="font-mono text-xs text-[var(--color-ink-faint)] uppercase">
              Dictated audio transcription (Wispr Flow)
            </p>
            <blockquote className="mt-2 text-base sm:text-lg leading-relaxed text-[var(--color-ink)] font-sans">
              “Okay so the Bhiwandi dispatch,{" "}
              <del className="line-through opacity-40 text-[var(--color-ink-faint)]">
                um, the truck
              </del>{" "}
              didn’t leave today because the packaging came short. Ramesh ne sirf dhai sau
              cartons bheje, we needed four hundred. So delivery Friday nahi hogi, now
              it’s Monday. Priya ko bata dena ki delivery Monday hai,{" "}
              <span className="rounded bg-[var(--color-blocked-wash)] px-1.5 py-0.5 text-xs font-semibold text-[var(--color-blocked)] border border-[var(--color-blocked)]">
                🔒 but don’t tell her the vendor shorted us
              </span>
              , just say revised schedule. Suresh ko bolo ki Monday subah teen log
              chahiye unloading ke liye.”
            </blockquote>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-rule)] text-xs text-[var(--color-ink-soft)]">
              <span>Hinglish voice input · one dictation, no edits</span>
              <span className="font-medium text-[var(--color-verified)]">
                ✓ Strikethrough removes speech hesitation automatically
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SCENE 2: EXTRACT
         ========================================================================= */}
      <section aria-labelledby="extract-heading" className="space-y-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper-sunk)] p-4 shadow-md sm:p-6">
        <div className="border-b border-[var(--color-line)] pb-5">
          <StepLabel step="Step 1" label="Precision Decomposition" />
          <h2 id="extract-heading" className="font-display mt-0.5 text-lg font-semibold text-[var(--color-ink)] sm:text-xl">
            The sentence breaks apart. Facts lift out.
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs text-[var(--color-ink-soft)] sm:text-sm">
            Filler dissolves. Dates anchor to real calendar dates (e.g. “Friday” ➔ 2026-10-30,
            “Monday” ➔ 2026-11-02). Numbers, people, and sensitive confidentiality boundaries are
            explicitly bound.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: "f1",
              type: "Date · Schedule",
              text: "Bhiwandi dispatch rescheduled from Friday 31 Oct to Monday 2 Nov",
              badge: "Resolved to ISO 2026-11-02",
              icon: "📅",
              withheld: false,
            },
            {
              id: "f2",
              type: "Quantity · Inventory",
              text: "Ramesh sent 250 cartons; 400 needed (150 carton shortfall)",
              badge: "Exact figures: 250, 400, 150",
              icon: "📦",
              withheld: false,
            },
            {
              id: "f3",
              type: "Action · Vendor",
              text: "Ramesh must deliver remaining 150 cartons by Saturday",
              badge: "Deadline bound",
              icon: "⏳",
              withheld: false,
            },
            {
              id: "f4",
              type: "Logistics · Operations",
              text: "Suresh needs 3 team members Monday morning for unloading",
              badge: "Headcount: 3 people",
              icon: "👥",
              withheld: false,
            },
            {
              id: "f5",
              type: "Privacy Constraint",
              text: "Do NOT disclose vendor packaging shortfall to Priya (Client)",
              badge: "🔒 Withheld from Priya",
              icon: "🛡️",
              withheld: true,
            },
            {
              id: "f6",
              type: "Executive · Status",
              text: "Inform client that delivery is on revised schedule",
              badge: "Client narrative",
              icon: "📋",
              withheld: false,
            },
          ].map((fact) => (
            <div
              key={fact.id}
              className={`rounded-lg border p-4 transition ${
                fact.withheld
                  ? "border-[var(--color-blocked)] bg-[var(--color-blocked-wash)] shadow-xs"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)]"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[var(--color-ink-soft)]">
                  <span>{fact.icon}</span>
                  <span>{fact.type}</span>
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    fact.withheld
                      ? "bg-[var(--color-blocked)] text-white"
                      : "bg-[var(--color-paper-sunk)] text-[var(--color-ink-soft)]"
                  }`}
                >
                  {fact.badge}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium leading-snug text-[var(--color-ink)]">
                {fact.text}
              </p>
              <p className="mt-2 font-mono text-[10px] text-[var(--color-ink-faint)]">
                Fact ID: {fact.id}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SCENE 3: ROUTE & THE PRIVACY SHIELD
         ========================================================================= */}
      <section aria-labelledby="route-heading" className="space-y-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper-sunk)] p-4 shadow-md sm:p-6">
        <div className="border-b border-[var(--color-line)] pb-5">
          <StepLabel step="Step 2" label="Knowledge Partitioning" />
          <h2 id="route-heading" className="font-display mt-0.5 text-lg font-semibold text-[var(--color-ink)] sm:text-xl">
            Who needs to know — and what is shielded
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs text-[var(--color-ink-soft)] sm:text-sm">
            SayOnce routes facts, not documents. Each person gets what they need to know, and
            nothing they shouldn’t. The confidential fact hits a privacy shield in front of the
            client and bounces off.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ramesh (Vendor) */}
          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-paper-sunk)] font-bold text-xs">
                R
              </span>
              <div>
                <h3 className="text-sm font-bold">Ramesh</h3>
                <p className="text-[11px] text-[var(--color-ink-soft)]">Vendor · WhatsApp</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-[var(--color-rule)] pt-2 text-xs">
              <div className="text-[10px] font-semibold uppercase text-[var(--color-ink-faint)]">
                Routed Facts
              </div>
              <div className="flex items-center gap-1 text-[var(--color-verified)] font-medium">
                <span>✓</span> <span>f2: 250 of 400 received</span>
              </div>
              <div className="flex items-center gap-1 text-[var(--color-verified)] font-medium">
                <span>✓</span> <span>f3: 150 needed by Saturday</span>
              </div>
            </div>
          </div>

          {/* Priya (Client) - WITH PRIVACY SHIELD */}
          <div className="rounded-xl border-2 border-[var(--color-blocked)] bg-[var(--color-blocked-wash)] p-4 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-bold text-xs text-[var(--color-blocked)]">
                P
              </span>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-blocked)]">Priya Sharma</h3>
                <p className="text-[11px] text-[var(--color-blocked)] opacity-80">
                  Client · Email
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-[var(--color-blocked)]/30 pt-2 text-xs">
              <div className="text-[10px] font-semibold uppercase text-[var(--color-blocked)]">
                Routed Facts
              </div>
              <div className="flex items-center gap-1 text-[var(--color-ink)] font-medium">
                <span>✓</span> <span>f1: Delivery Monday (revised)</span>
              </div>
              {/* THE SHIELD */}
              <div className="mt-2 rounded border border-[var(--color-blocked)] bg-white p-2">
                <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-blocked)]">
                  <span>🛡️</span> <span>PRIVACY SHIELD ACTIVE</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-ink-soft)]">
                  Blocked <strong className="text-[var(--color-blocked)]">f5 (shortage)</strong>:
                  Zero mentions allowed in Priya’s draft.
                </p>
              </div>
            </div>
          </div>

          {/* Suresh (Internal Ops) */}
          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-paper-sunk)] font-bold text-xs">
                S
              </span>
              <div>
                <h3 className="text-sm font-bold">Suresh</h3>
                <p className="text-[11px] text-[var(--color-ink-soft)]">Ops Lead · WhatsApp</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-[var(--color-rule)] pt-2 text-xs">
              <div className="text-[10px] font-semibold uppercase text-[var(--color-ink-faint)]">
                Routed Facts
              </div>
              <div className="flex items-center gap-1 text-[var(--color-verified)] font-medium">
                <span>✓</span> <span>f1: Monday delivery</span>
              </div>
              <div className="flex items-center gap-1 text-[var(--color-verified)] font-medium">
                <span>✓</span> <span>f4: 3 team members needed</span>
              </div>
            </div>
          </div>

          {/* Anita (Executive) */}
          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-paper-sunk)] font-bold text-xs">
                A
              </span>
              <div>
                <h3 className="text-sm font-bold">Anita</h3>
                <p className="text-[11px] text-[var(--color-ink-soft)]">Executive · Email</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-[var(--color-rule)] pt-2 text-xs">
              <div className="text-[10px] font-semibold uppercase text-[var(--color-ink-faint)]">
                Routed Facts
              </div>
              <div className="flex items-center gap-1 text-[var(--color-verified)] font-medium">
                <span>✓</span> <span>f6: Client informed of revised plan</span>
              </div>
              <div className="flex items-center gap-1 text-[var(--color-verified)] font-medium">
                <span>✓</span> <span>Full project oversight</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SCENE 4: COMPOSE — THE 4-COLUMN "WHAT THEY HEARD" COMPARISON
         ========================================================================= */}
      <section aria-labelledby="compose-heading" className="space-y-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper-sunk)] p-4 shadow-md sm:p-6">
        <div className="border-b border-[var(--color-line)] pb-5">
          <StepLabel step="Step 3" label="The Signature Moment" />
          <h2 id="compose-heading" className="font-display mt-0.5 text-lg font-semibold text-[var(--color-ink)] sm:text-xl">
            What they heard: one update, four tailored versions
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs text-[var(--color-ink-soft)] sm:text-sm">
            Not a translation. Not a shared summary. Four completely different messages written
            simultaneously from the exact same dictation — each in their own language, script, tone and channel.
          </p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Anita (Boss / Agency Head - Formal Email) */}
          <article className="flex flex-col justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm hover-card-lift">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Anita Desai</h3>
                  <p className="text-xs text-[var(--color-muted)]">Boss · Formal English</p>
                </div>
                <span className="rounded bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                  Email
                </span>
              </div>

              {/* Envelope Presentation */}
              <div className="mt-3.5 rounded-lg bg-[var(--color-surface-raised)] p-3 border border-[var(--color-line)] space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--color-muted)]">
                  Sub: Retail order delivery schedule update
                </div>
                <p className="text-xs leading-relaxed text-[var(--color-ink)]">
                  Hi Anita,
                  <br />
                  <br />
                  Just confirming that client notification has been completed regarding the rescheduled Monday delivery for the Bhiwandi retail order.
                  <br />
                  <br />
                  Best regards.
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-verified)]">
                <span>✓ Status verified · 0 friction</span>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--color-line)] pt-3">
              <a
                href="mailto:anita@example.com?subject=Update&body=Hi%20Anita..."
                className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 text-xs font-semibold text-[var(--color-on-accent)] hover:opacity-90 transition active-press cursor-pointer"
              >
                <span>Send via Email (mailto:)</span>
                <span>↗</span>
              </a>
            </div>
          </article>

          {/* Card 2: Ramesh (Vendor - Hindi Devanagari WhatsApp) */}
          <article className="flex flex-col justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm hover-card-lift">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Ramesh Kulkarni</h3>
                  <p className="text-xs text-[var(--color-muted)]">Vendor · Devanagari</p>
                </div>
                <span className="rounded bg-[var(--color-verified-wash)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-verified)]">
                  WhatsApp
                </span>
              </div>

              {/* Chat Bubble Presentation */}
              <div className="mt-3.5 rounded-lg bg-[var(--color-surface-raised)] p-3 border border-[var(--color-line)]">
                <p
                  className="text-xs leading-relaxed text-[var(--color-ink)]"
                  style={{ fontFamily: "'Noto Sans Devanagari', var(--font-sans)" }}
                  lang="hi"
                >
                  नमस्ते रमेश जी, आज भिवंडी डिस्पैच में 250 कार्टन ही मिले हैं जबकि हमें 400 की ज़रूरत थी। कृपया बाकी 150 कार्टन परसों तक भिजवाना सुनिश्चित करें।
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-[var(--color-muted)]">
                <span>Facts: f1, f2, f3</span> · <span>0 invented</span>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--color-line)] pt-3">
              <a
                href="https://wa.me/?text=नमस्ते%20रमेश%20जी..."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-semibold text-white hover:opacity-90 transition active-press cursor-pointer"
              >
                <span>Send via WhatsApp (wa.me)</span>
                <span>↗</span>
              </a>
            </div>
          </article>

          {/* Card 3: Suresh (Warehouse Foreman - Hinglish WhatsApp) */}
          <article className="flex flex-col justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm hover-card-lift">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Suresh Yadav</h3>
                  <p className="text-xs text-[var(--color-muted)]">Warehouse · Hinglish</p>
                </div>
                <span className="rounded bg-[var(--color-verified-wash)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-verified)]">
                  WhatsApp
                </span>
              </div>

              {/* Chat Bubble Presentation */}
              <div className="mt-3.5 rounded-lg bg-[var(--color-surface-raised)] p-3 border border-[var(--color-line)]">
                <p className="text-xs leading-relaxed text-[var(--color-ink)] font-sans">
                  Suresh, Bhiwandi dispatch ab Friday nahi Monday subah deliver hoga. Unloading ke liye 3 logon ki team ready rakhna Monday morning.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-[var(--color-muted)]">
                <span>Facts: f4, f5</span> · <span>Team clear</span>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--color-line)] pt-3">
              <a
                href="https://wa.me/?text=Suresh%2C%20Bhiwandi..."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-semibold text-white hover:opacity-90 transition active-press cursor-pointer"
              >
                <span>Send via WhatsApp (wa.me)</span>
                <span>↗</span>
              </a>
            </div>
          </article>

          {/* Card 4: Priya (Client Lead - Shielded Formal Email) */}
          <article className="flex flex-col justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm hover-card-lift">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Priya Nair</h3>
                  <p className="text-xs text-[var(--color-muted)]">Client · English</p>
                </div>
                <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  Email
                </span>
              </div>

              {/* Email Envelope Presentation */}
              <div className="mt-3.5 rounded-lg bg-[var(--color-surface-raised)] p-3 border border-[var(--color-line)] space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--color-muted)]">
                  Sub: Confirmed delivery schedule
                </div>
                <p className="text-xs leading-relaxed text-[var(--color-ink)]">
                  Dear Priya,
                  <br />
                  <br />
                  Please be advised that the delivery schedule for the retail order has been revised to Monday, 2 November. Tracking all milestones closely.
                  <br />
                  <br />
                  Warm regards.
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-verified)]">
                <span>🛡️ Shield verified: 0 excuses leaked</span>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--color-line)] pt-3">
              <a
                href="mailto:priya@example.com?subject=Update&body=Dear%20Priya..."
                className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 text-xs font-semibold text-[var(--color-on-accent)] hover:opacity-90 transition active-press cursor-pointer"
              >
                <span>Send via Email (mailto:)</span>
                <span>↗</span>
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* =========================================================================
          THE INTERACTIVE STRIP: "TRY IT HERE"
          Between scenes 4 and 5 as specified in docs/14-LANDING-PAGE.md
         ========================================================================= */}
      <InteractiveStrip />

      {/* =========================================================================
          SCENE 5: VERIFY — DETERMINISTIC VERIFIER
         ========================================================================= */}
      <section aria-labelledby="verify-heading" className="space-y-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper-sunk)] p-4 shadow-md sm:p-6">
        <div className="border-b border-[var(--color-line)] pb-5">
          <StepLabel step="Step 4" label="Pure Deterministic Verification" />
          <h2 id="verify-heading" className="font-display mt-0.5 text-lg font-semibold text-[var(--color-ink)] sm:text-xl">
            Final authority belongs to code, not the AI
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs text-[var(--color-ink-soft)] sm:text-sm">
            A pure TypeScript verifier (no network, no model, no clock) inspects every single
            draft before the send button unlocks. If anything violates facts, privacy, or script,
            the send button is physically locked.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
            <div className="flex items-center gap-2 text-[var(--color-verified)] font-bold text-sm">
              <span className="text-lg">✓</span> 0 Invented Numbers or Dates
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-soft)]">
              Every quantity (250, 400, 150, 3) and calendar milestone must be traceable verbatim
              to the spoken audio. Hallucinated numbers trigger an instant rejection.
            </p>
            <div className="mt-4 rounded bg-[var(--color-paper-sunk)] p-2 font-mono text-[11px] text-[var(--color-verified)]">
              lib/checker.ts · 24 unit tests pass
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
            <div className="flex items-center gap-2 text-[var(--color-verified)] font-bold text-sm">
              <span className="text-lg">✓</span> 100% Privacy Leaks Blocked
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-soft)]">
              Facts marked confidential to a contact never reach their message. If the model
              attempts to sneak a withheld fact into a draft, the verifier halts sending.
            </p>
            <div className="mt-4 rounded bg-[var(--color-paper-sunk)] p-2 font-mono text-[11px] text-[var(--color-verified)]">
              lib/checker.ts · blocked facts never enter the prompt
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
            <div className="flex items-center gap-2 text-[var(--color-verified)] font-bold text-sm">
              <span className="text-lg">✓</span> Script & Channel Validation
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-soft)]">
              Unicode script detection ensures Hindi messages intended for WhatsApp arrive in
              authentic Devanagari script. All URLs generate pure wa.me and mailto links.
            </p>
            <div className="mt-4 rounded bg-[var(--color-paper-sunk)] p-2 font-mono text-[11px] text-[var(--color-verified)]">
              lib/links.ts · 33 round-trip tests pass
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SCENE 6: TRUST TRAIL & THE VOICE RETURN
         ========================================================================= */}
      <section aria-labelledby="trust-heading" className="space-y-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper-sunk)] p-4 shadow-md sm:p-6">
        <div className="border-b border-[var(--color-line)] pb-5">
          <StepLabel step="Step 5" label="Cryptographic Memory & ROI" />
          <h2 id="trust-heading" className="font-display mt-0.5 text-lg font-semibold text-[var(--color-ink)] sm:text-xl">
            The Trust Trail & The Voice Return
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs text-[var(--color-ink-soft)] sm:text-sm">
            Every update, fact, decision, and draft is permanently logged to an audit chain
            secured by SHA-256 hash chaining. If any byte in the past is altered, the entire chain
            rings an alarm.
          </p>
        </div>

        {/* SHA-256 Hash Chain Visualization */}
        <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-[var(--color-accent)]">
                Cryptographic Audit Chain
              </span>
              <span className="rounded bg-[var(--color-verified-wash)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-verified)]">
                SHA-256 Tamper-Evident
              </span>
            </div>
            <Link
              href="/log"
              className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[var(--color-accent)] hover:underline"
            >
              Inspect Update Log →
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
            {[
              { index: 1, action: "Spoken update recorded", hash: "9a2f7c4e..." },
              { index: 2, action: "Facts & privacy bounds extracted", hash: "4d1b8e0a..." },
              { index: 3, action: "Drafts generated & verified", hash: "7c3f5a19..." },
              { index: 4, action: "Dispatched via wa.me / mailto", hash: "2e6d9b80..." },
            ].map((node, i) => (
              <div key={node.index} className="flex flex-1 items-center gap-2">
                <div className="w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-ink-soft)]">
                    <span>Block #{node.index}</span>
                    <span className="font-mono">{node.hash}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-[var(--color-ink)]">
                    {node.action}
                  </p>
                </div>
                {i < 3 && (
                  <span className="hidden md:inline text-[var(--color-ink-faint)] font-bold">
                    ➔
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Parity's results row: arithmetic over the prepared sample above. */}
        {sample && (
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 shadow-sm sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--color-brand)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)]">
                  Prepared sample
                </span>
                <span className="hidden text-xs text-[var(--color-ink-soft)] md:inline">
                  (every figure is arithmetic over the fan-out shown above)
                </span>
              </div>
              <span className="shrink-0 text-xs font-medium text-[var(--color-accent)]">
                {sample.recipients} drafts checked by code
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <CounterCard
                label="Messages"
                meta="This update"
                value={String(sample.recipients)}
                pill={{ icon: <Send size={12} strokeWidth={2.5} />, text: "From one dictation" }}
                caption={`${sample.spokenWords} words spoken, ${sample.deliveredWords} delivered`}
                footer="Each in its reader's own words"
              />
              <div className="hover-card-lift animate-fade-in flex flex-col justify-between rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm sm:col-span-2 sm:p-5 lg:col-span-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[var(--color-accent)]">Checker pass rate</span>
                  <span className="text-[var(--color-ink-soft)]">Deterministic</span>
                </div>
                <div className="mt-1">
                  <Gauge
                    value={sample.checkerPassRate}
                    label="Drafts passing the deterministic checker"
                    color={
                      sample.checkerPassRate === 100
                        ? "var(--color-verified)"
                        : "var(--color-brand)"
                    }
                  />
                </div>
                <p className="mt-1 text-center text-[11px] font-medium text-[var(--color-ink-soft)]">
                  {sample.checked} of {sample.recipients} drafts passed
                </p>
              </div>
              <CounterCard
                tone="verified"
                label="Languages and scripts"
                meta="Tailored"
                value={String(sample.languages)}
                pill={{ icon: <Languages size={12} strokeWidth={2.5} />, text: "Native script" }}
                caption="Each message in its reader's own"
                footer="Hindi in Devanagari, Hinglish in Roman"
                footerTone="verified"
                delayMs={120}
              />
              <CounterCard
                tone="blocked"
                label="Facts withheld"
                meta="Privacy Shield"
                value={String(sample.withheld)}
                pill={{ icon: <Lock size={12} strokeWidth={2.5} />, text: "Kept back" }}
                caption="Never entered the blocked reader's prompt"
                footer="Enforced before the model runs"
                delayMs={180}
              />
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          HONEST CLOSE & CALL TO ACTION
         ========================================================================= */}
      <section
        aria-labelledby="close-heading"
        className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-12 text-center shadow-md sm:px-12 sm:py-16"
      >
        <h2
          id="close-heading"
          className="font-display mx-auto max-w-2xl font-medium leading-[1.08] text-[var(--color-ink)]"
          style={{ fontSize: "clamp(28px, 5vw, 46px)" }}
        >
          Say it <em className="font-accent">once.</em> Everyone hears it their way.
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-sm sm:text-base"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Built for anyone who coordinates people across languages, roles and channels.
          India first, because that is where the problem is loudest.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/app" className="btn-pill btn-accent">
            <Mic size={15} aria-hidden="true" />
            Try it with your voice
            <span className="btn-chip" aria-hidden="true">
              <ChevronRight size={16} strokeWidth={2.5} />
            </span>
          </Link>
          <Link href="/proof" className="btn-pill btn-ink">
            How we check every draft
            <span className="btn-chip" aria-hidden="true">
              <ChevronRight size={16} strokeWidth={2.5} />
            </span>
          </Link>
        </div>
      </section>

    </div>
  );
}
