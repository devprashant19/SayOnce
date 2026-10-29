"use client";

import { useCallback, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SpeakBox } from "@/components/SpeakBox";
import { DraftCard } from "@/components/DraftCard";
import { FactList } from "@/components/FactList";
import { KnowledgeMatrix } from "@/components/KnowledgeMatrix";
import { PrivacyPanel } from "@/components/PrivacyPanel";
import { TrustTrailViewer } from "@/components/TrustTrailViewer";
import { ContradictionBanner } from "@/components/ContradictionBanner";
import { SendGuidedQueue, type QueueItem } from "@/components/SendGuidedQueue";
import { CommandBar } from "@/components/CommandBar";
import { GuidedTour } from "@/components/GuidedTour";
import { Badge } from "@/components/Badge";
import { sendTargetFor } from "@/lib/links";
import { CONTACT_SET_LABELS } from "@/lib/contact-sets";
import type { Contact, Draft, Fact } from "@/lib/types";
import type { CheckOutcome } from "@/lib/checker";
import type { VoiceReturn } from "@/lib/voice-return";
import type { TrailEntry } from "@/lib/trail";
import type { ContradictionAlert } from "@/lib/consistency";
import type { ParsedCommand } from "@/lib/command-bar";
import demoUpdates from "@/data/demo/updates.json";

interface Card {
  messageId: string;
  contact: Contact;
  draft: Draft | null;
  check: CheckOutcome | null;
  error: string | null;
  overridden?: boolean;
  sent?: boolean;
  sentAt?: string | null;
}

interface FanoutResponse {
  updateId: string;
  spokenText: string;
  summary: string;
  decisions: string[];
  facts: Fact[];
  cards: Card[];
  routing?: {
    concernsNobody: boolean;
    decisions: Array<{
      contactId: string;
      include: boolean;
      reason: string;
      confidence: number;
      factIds: string[];
    }>;
  };
  contradictions?: ContradictionAlert[];
  whoDidIForget?: Array<{
    contactId: string;
    name: string;
    timesSeen: number;
    totalRecent: number;
  }>;
  voiceReturn: VoiceReturn;
  trail: TrailEntry[];
  trailVerdict: { ok: boolean; length: number };
  /**
   * Present when the fan-out was served from prepared output rather than run
   * live. The app lines the input up with `preparedText` so the cards on
   * screen always belong to the words on screen.
   */
  mode?: "instant";
  message?: string;
  preparedFrom?: string;
  preparedText?: string;
  preparedProject?: string;
}

const PROJECTS = ["Diwali retail order", "Warehouse shift", "Q4 export run", "Other"];

function SpeakContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1" || searchParams.get("demo") === "true";
  const [spokenText, setSpokenText] = useState("");
  const [project, setProject] = useState(PROJECTS[0]!);
  const [contactSet, setContactSet] = useState("india");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instantMode, setInstantMode] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(
    isDemo ? demoUpdates[0]!.id : null,
  );
  const [result, setResult] = useState<FanoutResponse | null>(null);
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const [activeRecipients, setActiveRecipients] = useState<string[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [mountTime] = useState(() => Date.now());
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setSpokenText((prev) => (prev ? prev : demoUpdates[0]!.spokenText));
      setProject((prev) => (prev ? prev : demoUpdates[0]!.project));
      fetch("/api/demo/session")
        .then((r) => r.json())
        .then((d) => {
          if (d?.token) setSessionToken(d.token);
        })
        .catch(() => {});
    }
  }, [isDemo]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandBarOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleApplyCorrection = useCallback((alert: ContradictionAlert) => {
    setResult((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        cards: prev.cards.map((c) => {
          if (c.contact.id === alert.recipientId && c.draft) {
            return {
              ...c,
              draft: {
                ...c.draft,
                body: `${c.draft.body}\n\n${alert.suggestedCorrection}`,
              },
            };
          }
          return c;
        }),
      };
    });
  }, []);

  const handleExecuteCommand = useCallback(
    (cmd: ParsedCommand) => {
      switch (cmd.action) {
        case "send_selected": {
          if (!result) break;
          if (cmd.targets.includes("all")) {
            const excludeLower = cmd.excludeTargets.map((t) => t.toLowerCase());
            const toSend = result.cards.filter(
              (c) =>
                c.draft &&
                c.check?.ok &&
                !excludeLower.some((ex) => c.contact.name.toLowerCase().includes(ex)),
            );
            setActiveRecipients(toSend.map((c) => c.contact.id));
            setShowQueue(true);
          } else {
            const match = result.cards.find((c) =>
              cmd.targets.some((t) => c.contact.name.toLowerCase().includes(t.toLowerCase())),
            );
            if (match && match.draft && match.check?.ok) {
              const target = sendTargetFor(match.draft, match.contact);
              if (target.href) {
                window.open(target.href, "_blank", "noopener,noreferrer");
                handleToggleSent(match.messageId, true);
              }
            }
          }
          break;
        }
        case "modify_draft": {
          if (!result) break;
          const target = result.cards.find((c) =>
            cmd.targets.some(
              (t) =>
                c.contact.name.toLowerCase().includes(t.toLowerCase()) ||
                (t.toLowerCase() === "boss" && c.contact.role.toLowerCase().includes("head")),
            ),
          );
          if (target && target.draft) {
            const sentences = target.draft.body.split(/(?<=[.?!])\s+/);
            if (sentences.length > 2) {
              const shortened = sentences.slice(0, 2).join(" ");
              setResult((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  cards: prev.cards.map((c) =>
                    c.contact.id === target.contact.id && c.draft
                      ? { ...c, draft: { ...c.draft, body: shortened } }
                      : c,
                  ),
                };
              });
            }
          }
          break;
        }
        case "switch_dataset": {
          if (cmd.params.dataset) {
            setContactSet(cmd.params.dataset);
          }
          break;
        }
        case "filter_project": {
          if (cmd.params.project) {
            setProject(cmd.params.project);
          }
          break;
        }
        case "clear": {
          setSpokenText("");
          setResult(null);
          setError(null);
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result],
  );

  const fanOut = useCallback(async () => {
    if (spokenText.trim().length === 0) {
      setError("Say something first — hold your Wispr key and talk.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - mountTime) / 1000));
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (sessionToken) {
        headers["x-demo-session-token"] = sessionToken;
      }
      const response = await fetch("/api/fanout", {
        method: "POST",
        headers,
        body: JSON.stringify({
          spokenText,
          project,
          contactSet,
          elapsedSeconds,
          ...(selectedDemoId ? { demoId: selectedDemoId } : {}),
        }),
      });
      const payload = (await response.json()) as FanoutResponse | { error: string };
      if (!response.ok) {
        setError("error" in payload ? payload.error : "Fan out failed. Try again.");
        setInstantMode(false);
        return;
      }
      setError(null);
      const fanoutData = payload as FanoutResponse;

      // A prepared fan-out. Put its words in the box so the drafts on screen
      // match the update on screen, and mark the sample that produced them.
      if (fanoutData.mode === "instant") {
        setInstantMode(true);
        if (fanoutData.preparedText) {
          setSpokenText(fanoutData.preparedText);
          if (fanoutData.preparedProject) setProject(fanoutData.preparedProject);
          setSelectedDemoId(fanoutData.preparedFrom ?? null);
        }
      } else {
        setInstantMode(false);
      }

      setResult(fanoutData);
      const activeIds = fanoutData.cards.filter((c) => c.draft !== null).map((c) => c.contact.id);
      setActiveRecipients(activeIds);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [spokenText, project, contactSet, mountTime, sessionToken, selectedDemoId]);

  const handleToggleSent = useCallback(
    async (messageId: string, nextSent: boolean) => {
      if (!result) return;
      const card = result.cards.find((c) => c.messageId === messageId);
      if (!card || !card.draft) return;

      try {
        const response = await fetch(`/api/messages/${messageId}/sent`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            updateId: result.updateId,
            contactId: card.contact.id,
            channel: card.draft.channel,
            sent: nextSent,
          }),
        });

        if (response.ok) {
          const payload = await response.json();
          setResult((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              cards: prev.cards.map((c) =>
                c.messageId === messageId
                  ? { ...c, sent: nextSent, sentAt: payload.sentAt }
                  : c,
              ),
              trailVerdict: payload.trailVerdict ?? prev.trailVerdict,
            };
          });
        }
      } catch (err) {
        console.warn("Could not record sent status:", err);
      }
    },
    [result],
  );

  const handleOverride = useCallback(
    async (messageId: string) => {
      if (!result) return;
      const card = result.cards.find((c) => c.messageId === messageId);
      if (!card) return;

      try {
        const response = await fetch(`/api/messages/${messageId}/override`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            updateId: result.updateId,
            contactId: card.contact.id,
            reason: "Speaker override",
          }),
        });

        if (response.ok) {
          const payload = await response.json();
          setResult((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              cards: prev.cards.map((c) =>
                c.messageId === messageId ? { ...c, overridden: true } : c,
              ),
              trailVerdict: payload.trailVerdict ?? prev.trailVerdict,
            };
          });
        }
      } catch (err) {
        console.warn("Override failed:", err);
      }
    },
    [result],
  );

  const samples = demoUpdates.filter((u) => u.contactSet === contactSet);

  const sendableQueueItems: QueueItem[] = result
    ? result.cards
        .filter(
          (c) =>
            activeRecipients.includes(c.contact.id) &&
            c.draft !== null &&
            c.check?.ok === true,
        )
        .map((c) => ({
          messageId: c.messageId,
          contact: c.contact,
          draft: c.draft!,
          check: c.check,
          target: sendTargetFor(c.draft!, c.contact),
          isSent: c.sent ?? false,
          sentAt: c.sentAt ?? null,
        }))
        .filter((q) => q.target.href !== null)
    : [];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Speak</h1>
            <p className="mt-1 text-[var(--color-ink-soft)]">
              One update. Everyone who needs to know gets their own version.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCommandBarOpen(true)}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 text-xs font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <span>⌘K</span>
            <span>Command Bar</span>
          </button>
        </div>

        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-sunk)]/50 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-[var(--color-ink)]">How SayOnce works:</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[var(--color-ink-soft)]">
              <span><strong>1. Speak</strong> raw update (mix Hindi & English)</span>
              <span>→</span>
              <span><strong>2. Shield</strong> recipient secrets & verify facts</span>
              <span>→</span>
              <span><strong>3. Send</strong> tailored WhatsApp/Email in one tap</span>
            </div>
          </div>
        </div>

        {isDemo && (
          <div className="mt-3 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-accent-wash)] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <div>
                <p className="text-sm font-bold text-[var(--color-ink)]">
                  Demo mode. Press Fan out, or replace the text with your own.
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Pre-cached sample updates run instantly with zero AI latency. Real contacts are hidden in demo mode.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTourOpen(true)}
                className="min-h-11 inline-flex items-center rounded bg-[var(--color-accent)] px-4 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Guided tour (5 steps)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpokenText(demoUpdates[0]!.spokenText);
                  setProject(demoUpdates[0]!.project);
                  setContactSet("india");
                  setResult(null);
                }}
                className="min-h-11 inline-flex items-center rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-semibold hover:bg-[var(--color-paper-sunk)] transition"
              >
                Reset demo ↺
              </button>
              <Link
                href="/lab"
                className="min-h-11 inline-flex items-center px-2 text-xs font-medium text-[var(--color-ink-soft)] hover:underline"
              >
                Quality Lab →
              </Link>
              <Link
                href="/proof"
                className="min-h-11 inline-flex items-center px-2 text-xs font-medium text-[var(--color-ink-soft)] hover:underline"
              >
                Proof & ROI →
              </Link>
            </div>
          </div>
        )}

        <div id="fanout-controls" className="mt-6 space-y-4">
          <SpeakBox
            value={spokenText}
            onChange={(val) => {
              setSpokenText(val);
              setSelectedDemoId(null);
            }}
            onSubmit={fanOut}
            disabled={busy}
          />

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="project" className="block text-sm font-medium">
                Project
              </label>
              <select
                id="project"
                value={project}
                onChange={(event) => setProject(event.target.value)}
                className="mt-1 min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-sm"
              >
                {PROJECTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="contact-set" className="block text-sm font-medium">
                Contacts
              </label>
              <select
                id="contact-set"
                value={contactSet}
                onChange={(event) => setContactSet(event.target.value)}
                className="mt-1 min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-sm"
              >
                {Object.entries(CONTACT_SET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={fanOut}
              disabled={busy}
              className="min-h-11 rounded bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Fanning out…" : "Fan out"}
            </button>
          </div>

          <div>
            <p className="text-sm font-medium">Or try a sample update</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {samples.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    setSpokenText(sample.spokenText);
                    setProject(sample.project);
                    setSelectedDemoId(sample.id);
                    setInstantMode(false);
                    setError(null);
                  }}
                  className={`min-h-11 inline-flex items-center rounded-full border px-4 text-xs transition ${
                    instantMode
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 font-bold text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]"
                      : "border-[var(--color-rule)] hover:bg-[var(--color-paper-sunk)]"
                  }`}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {instantMode && (
          <div
            role="status"
            className="mt-4 rounded-[var(--radius-card)] border-2 border-[var(--color-accent)] bg-[var(--color-accent-wash)] p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">⚡</span>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-sm text-[var(--color-ink)]">
                    Instant mode
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                    Showing a prepared fan-out, drafted and checked ahead of time
                    so it appears with no wait. Pick another sample to switch:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {samples.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => {
                        setSpokenText(sample.spokenText);
                        setProject(sample.project);
                        setSelectedDemoId(sample.id);
                        setInstantMode(false);
                        setError(null);
                      }}
                      className="min-h-11 rounded-full border-2 border-[var(--color-accent)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-accent)] hover:text-white transition transform active:scale-95 inline-flex items-center gap-1.5"
                    >
                      <span>▶</span>
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {error !== null && !instantMode && (
          <p
            role="alert"
            className="mt-4 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-3 text-sm"
          >
            {error}
          </p>
        )}
      </section>

      {busy && (
        <section aria-live="polite" aria-label="Fanning out drafts" className="space-y-4">
          <div className="h-14 animate-pulse rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-4 flex items-center justify-between">
            <div className="h-4 w-44 rounded bg-[var(--color-rule)]" />
            <div className="h-4 w-20 rounded bg-[var(--color-rule)]" />
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-rule)]" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--color-rule)]" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--color-rule)]" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full animate-pulse rounded bg-[var(--color-paper-sunk)]" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-paper-sunk)]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-paper-sunk)]" />
              </div>
              <div className="pt-2 flex gap-2">
                <div className="h-9 w-20 animate-pulse rounded bg-[var(--color-rule)]" />
                <div className="h-9 w-32 animate-pulse rounded bg-[var(--color-rule)]" />
              </div>
            </div>
          ))}
        </section>
      )}

      {result !== null && (
        <>
          <FactList
            facts={result.facts}
            spokenText={result.spokenText}
            highlightFactIds={highlight}
          />

          <div id="knowledge-matrix-section">
            <KnowledgeMatrix
              facts={result.facts}
              contacts={result.cards.map((c) => c.contact)}
              cards={result.cards}
              activeContactIds={activeRecipients}
              onToggleContact={(id) => {
                setActiveRecipients((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                );
              }}
              onHighlightFact={(factId) => setHighlight(factId ? [factId] : null)}
            />
          </div>

          <section id="trail-badge-section" className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={result.trailVerdict.ok ? "verified" : "blocked"}>
              Trust trail {result.trailVerdict.ok ? "intact" : "broken"} ·{" "}
              {result.trailVerdict.length} entries
            </Badge>
            <span className="text-[var(--color-ink-soft)]">
              You spoke {result.voiceReturn.wordsSpoken} words. SayOnce delivered{" "}
              {result.voiceReturn.wordsDelivered} words to {result.voiceReturn.people} people
              in {result.voiceReturn.languages}{" "}
              {result.voiceReturn.languages === 1 ? "language" : "languages"}.
              {result.voiceReturn.minutesSaved !== null &&
                ` About ${result.voiceReturn.minutesSaved} minutes saved.`}
            </span>
          </section>

          {result.routing?.concernsNobody && (
            <div className="rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-4 text-sm text-[var(--color-ink-soft)]">
              This update concerns nobody on the selected roster. No drafts were generated.
            </div>
          )}

          {result.contradictions && result.contradictions.length > 0 && (
            <ContradictionBanner
              alerts={result.contradictions}
              updateId={result.updateId}
              onApplyCorrection={handleApplyCorrection}
            />
          )}

          {result.whoDidIForget && result.whoDidIForget.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-accent)]/40 bg-[var(--color-accent-wash)] p-3.5 text-xs flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span className="text-[var(--color-ink)]">
                  <strong>Who did I forget?</strong>{" "}
                  {result.whoDidIForget
                    .map(
                      (f) =>
                        `${f.name} usually hears about "${project}" (${f.timesSeen} of last ${f.totalRecent} updates)`,
                    )
                    .join("; ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {result.whoDidIForget.map((f) => (
                  <button
                    key={f.contactId}
                    type="button"
                    onClick={() =>
                      setActiveRecipients((prev) =>
                        prev.includes(f.contactId) ? prev : [...prev, f.contactId],
                      )
                    }
                    className="rounded bg-[var(--color-ink)] px-2.5 py-1 font-semibold text-white hover:opacity-90"
                  >
                    Add {f.name} +
                  </button>
                ))}
              </div>
            </div>
          )}

          <section id="drafts-section" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {result.cards.filter((c) => activeRecipients.includes(c.contact.id) && c.draft !== null).length}{" "}
                {result.cards.filter((c) => activeRecipients.includes(c.contact.id) && c.draft !== null).length === 1 ? "message" : "messages"}
              </h2>
              {sendableQueueItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowQueue(true)}
                  className="rounded bg-[var(--color-ink)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                >
                  Send all ({sendableQueueItems.filter((q) => !q.isSent).length} pending) · Guided queue →
                </button>
              )}
            </div>

            {result.cards
              .filter((card) => activeRecipients.includes(card.contact.id) && (card.draft !== null || card.error !== null))
              .map((card, index) => {
                const target =
                  card.draft === null
                    ? null
                    : sendTargetFor(card.draft, card.contact);
                return (
                  <DraftCard
                    key={card.contact.id}
                    index={index}
                    messageId={card.messageId}
                    updateId={result.updateId}
                    contact={card.contact}
                    draft={card.draft}
                    check={card.check}
                    error={card.error}
                    facts={result.facts}
                    project={project}
                    sendHref={target?.href ?? null}
                    sendLabel={target?.label ?? "Send"}
                    sendBlockedReason={target?.blockedReason ?? null}
                    sent={card.sent}
                    sentAt={card.sentAt}
                    overridden={card.overridden}
                    onToggleSent={handleToggleSent}
                    onOverride={handleOverride}
                    onHoverSentence={setHighlight}
                    activeFactIds={highlight}
                  />
                );
              })}
          </section>

          <div id="privacy-shield-section">
            <PrivacyPanel
              facts={result.facts}
              contacts={result.cards.map((c) => c.contact)}
            />
          </div>

          <div id="trail-section">
            <TrustTrailViewer
              entries={result.trail}
              updateId={result.updateId}
            />
          </div>

          {showQueue && result && (
            <SendGuidedQueue
              items={sendableQueueItems}
              updateId={result.updateId}
              onClose={() => setShowQueue(false)}
              onToggleSent={handleToggleSent}
            />
          )}
        </>
      )}

      <CommandBar
        isOpen={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onExecute={handleExecuteCommand}
      />

      <GuidedTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
    </div>
  );
}

export default function SpeakPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--color-ink-soft)]">Loading SayOnce Speak…</div>}>
      <SpeakContent />
    </Suspense>
  );
}
