"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "./Badge";
import { sendTargetFor } from "@/lib/links";
import type { Contact, Draft, Fact } from "@/lib/types";
import type { CheckOutcome } from "@/lib/checker";

interface FanoutCard {
  messageId: string;
  contact: Contact;
  draft: Draft | null;
  check: CheckOutcome | null;
  error: string | null;
}

interface FanoutResponse {
  updateId: string;
  project: string;
  facts: Fact[];
  cards: FanoutCard[];
}

interface PresetItem {
  id: string;
  label: string;
  project: string;
  contactSet: string;
  spokenText: string;
}

const PRESETS: PresetItem[] = [
  {
    id: "demo_in_1",
    label: "📦 Diwali Retail Delay (Hinglish)",
    project: "Diwali retail order",
    contactSet: "india",
    spokenText:
      "Okay so the Bhiwandi dispatch, um, the truck didn't leave today because the packaging came short. Ramesh ne sirf dhai sau cartons bheje, we needed four hundred. So delivery Friday nahi hogi, now it's Monday. Priya ko bata dena ki delivery Monday hai, but don't tell her the vendor shorted us, just say revised schedule. Suresh ko bolo ki Monday subah teen log chahiye unloading ke liye. And Ramesh se confirm karo baaki ek sau pachaas cartons parso tak aa jaayein. Anita ko main khud batata hoon ki client ko inform kar diya.",
  },
  {
    id: "demo_in_2",
    label: "🔒 Mid-sentence Audit Correction",
    project: "Diwali retail order",
    contactSet: "india",
    spokenText:
      "Quick update. The audit is on Tuesday, no wait, Wednesday. Anita only for now, I don't want the vendor or the client knowing we're being audited. I'll need last quarter's dispatch records by Wednesday morning, Imran can pull those.",
  },
  {
    id: "demo_gl_1",
    label: "🌍 Global Multilingual (ES / PT / Taglish)",
    project: "Q4 export run",
    contactSet: "global",
    spokenText:
      "Right, the São Paulo line is down to one shift from tomorrow, so the November run drops from twelve thousand units to eight thousand. Maria needs to know her November delivery is eight thousand and the rest moves to December the fifteenth. Don't tell her it's a line problem, just say revised production plan. Lucía should hold the pickup until the eighteenth. João needs four people instead of seven on the morning shift. Jomar, reconfirm the freight booking for the eighteenth.",
  },
];

export function InteractiveStrip() {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0]!.id);
  const [spokenText, setSpokenText] = useState<string>(PRESETS[0]!.spokenText);
  const [activePreset, setActivePreset] = useState<PresetItem>(PRESETS[0]!);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<FanoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runFanout(textToRun: string, preset = activePreset) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fanout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spokenText: textToRun,
          spokenOnIso: "2026-10-29",
          contactSet: preset.contactSet,
          project: preset.project,
          demoId: preset.id || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Fan-out failed: HTTP ${res.status}`);
      }

      const data: FanoutResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSelectPreset(preset: PresetItem) {
    setSelectedPreset(preset.id);
    setActivePreset(preset);
    setSpokenText(preset.spokenText);
    void runFanout(preset.spokenText, preset);
  }

  return (
    <section aria-labelledby="interactive-strip-heading" className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            Live Interactive Strip
          </span>
          <h2 id="interactive-strip-heading" className="mt-1 text-2xl font-bold tracking-tight">
            Try it here — one update, four different messages
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Pick a realistic sample (instant cached demo) or type your own update.
          </p>
        </div>
        <Link
          href="/app"
          className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
        >
          Open full Speak app →
        </Link>
      </div>

      {/* Preset Chips */}
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Sample updates">
        {PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)]"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Input box */}
      <div className="mt-4">
        <label htmlFor="interactive-spoken-text" className="sr-only">
          Spoken work update
        </label>
        <textarea
          id="interactive-spoken-text"
          value={spokenText}
          rows={4}
          onChange={(e) => {
            setSpokenText(e.target.value);
            setSelectedPreset("");
          }}
          placeholder="Type or paste a work update here..."
          className="w-full resize-y rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 text-sm leading-relaxed outline-none focus:border-[var(--color-accent)]"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[var(--color-ink-faint)]">
            {spokenText.trim().split(/\s+/).filter(Boolean).length} words
          </span>
          <button
            type="button"
            onClick={() => void runFanout(spokenText, { id: "", label: "custom", project: "", contactSet: "india", spokenText })}
            disabled={loading || !spokenText.trim()}
            className="rounded bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {loading ? "Fanning out…" : "Fan out update"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded border border-[var(--color-blocked)] bg-[var(--color-blocked-wash)] p-3 text-xs text-[var(--color-blocked)]">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="mt-6 space-y-4">
          <div className="h-4 w-48 animate-pulse rounded bg-[var(--color-rule)]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-[var(--color-rule)]" />
                  <div className="h-4 w-16 rounded bg-[var(--color-rule)]" />
                </div>
                <div className="h-3 w-3/4 rounded bg-[var(--color-rule)]" />
                <div className="h-16 w-full rounded bg-[var(--color-rule)]" />
                <div className="h-8 w-full rounded bg-[var(--color-rule)]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Results */}
      {!loading && result && (
        <div className="mt-6 space-y-6">
          {/* Extracted Facts */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
                Extracted Facts ({result.facts.length})
              </h3>
              <span className="text-[10px] text-[var(--color-ink-faint)]">
                Dates resolved · Secret bounds flagged
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.facts.map((fact) => {
                const isWithheld =
                  fact.privacy.blockedFor && fact.privacy.blockedFor.length > 0;
                return (
                  <div
                    key={fact.id}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                      isWithheld
                        ? "border-[var(--color-blocked)] bg-[var(--color-blocked-wash)] text-[var(--color-blocked)] font-medium"
                        : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)]"
                    }`}
                  >
                    <span>{isWithheld ? "🔒" : "✓"}</span>
                    <span>{fact.text}</span>
                    {isWithheld && (
                      <span className="text-[10px] opacity-80">
                        (Withheld from: {fact.privacy.blockedFor.join(", ")})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Draft Cards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
              Tailored Drafts ({result.cards.filter((c) => c.draft !== null).length})
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.cards
                .filter((card) => card.draft !== null)
                .map((card) => {
                  const passed = card.check?.ok ?? false;
                  const isEmail = card.contact.channel === "email";
                  const target = sendTargetFor(card.draft!, card.contact);

                  return (
                    <article
                      key={card.contact.id}
                      className="flex flex-col justify-between rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 shadow-xs"
                    >
                      <div>
                        {/* Recipient Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm">
                              {card.contact.name}
                            </h4>
                            <p className="text-xs text-[var(--color-ink-faint)]">
                              {card.contact.role} · {card.contact.language}
                            </p>
                          </div>
                          <Badge tone={passed ? "verified" : "blocked"}>
                            {passed ? "Verified" : "Held Back"}
                          </Badge>
                        </div>

                        {/* Subject if email */}
                        {isEmail && card.draft?.subject && (
                          <div className="mt-2.5 rounded bg-[var(--color-paper-sunk)] px-2 py-1 text-xs font-medium text-[var(--color-ink-soft)]">
                            Sub: {card.draft.subject}
                          </div>
                        )}

                        {/* Body */}
                        <p
                          className="mt-3 text-xs leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap font-sans"
                          lang={
                            card.contact.language.toLowerCase().includes("hindi")
                              ? "hi"
                              : undefined
                          }
                        >
                          {card.draft?.body ?? "(No draft generated)"}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-[var(--color-rule)] flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[var(--color-ink-faint)] uppercase font-semibold">
                          {card.contact.channel}
                        </span>
                        {target.href && passed ? (
                          <a
                            href={target.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-[var(--color-ink)] px-2.5 py-1 text-xs font-semibold text-[var(--color-paper)] hover:opacity-90"
                          >
                            <span>{target.label}</span>
                            <span>↗</span>
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--color-blocked)] font-medium">
                            {target.blockedReason ?? "Send locked"}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
