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
import { AlertTriangle, CheckCircle2, Lock, Send } from "lucide-react";
import { CounterCard } from "@/components/parity/CounterCard";
import { Gauge } from "@/components/parity/Gauge";
import { StepLabel } from "@/components/parity/Tray";
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
  /** True when served from a prepared sample rather than run live. */
  cached?: boolean;
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
  // Outside the judge demo, your own roster comes first. /app offered only
  // the two demo teams, so nothing spoken here could ever count as real use
  // on /log or /proof.
  const [contactSet, setContactSet] = useState(isDemo ? "india" : "freelance");
  const rosterLabels = isDemo ? CONTACT_SET_LABELS : { freelance: "My contacts", ...CONTACT_SET_LABELS };
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
      setTourOpen(true);
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
          // The prepared sample belongs to a demo team: show that team as the
          // roster, so the people on the cards match the roster selected.
          const sample = demoUpdates.find((u) => u.id === fanoutData.preparedFrom);
          if (sample) setContactSet(sample.contactSet);
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
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Speak Console
            </h1>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              One update. Everyone who needs to know gets their own version.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCommandBarOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-xs font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] active-press transition"
          >
            <kbd className="font-mono text-[10px] bg-[var(--color-paper-sunk)] px-1.5 py-0.5 rounded border border-[var(--color-rule)]">⌘K</kbd>
            <span>Command Bar</span>
          </button>
        </div>

        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-3 text-xs">
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
          <div className="mt-3 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-wash)] px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] text-[10px] font-bold">●</span>
              <div>
                <p className="text-xs font-semibold text-[var(--color-ink)]">
                  Demo mode. Press Fan out, or replace the text with your own.
                </p>
                <p className="text-[11px] text-[var(--color-ink-soft)]">
                  Pre-cached sample updates run instantly with zero AI latency.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTourOpen(true)}
                className="min-h-11 inline-flex items-center rounded-lg bg-[var(--color-accent)] px-3.5 text-xs font-semibold text-[var(--color-on-accent)] hover:opacity-90 active-press transition"
              >
                Guided tour (5 steps)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpokenText(demoUpdates[0]!.spokenText);
                  setProject(demoUpdates[0]!.project);
                  setContactSet("india");
                  setSelectedDemoId(demoUpdates[0]!.id);
                  setResult(null);
                  setHighlight(null);
                  setTourOpen(true);
                }}
                className="min-h-11 inline-flex items-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)] active-press transition"
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
      </header>

      {/* Two-pane at >=1024px: Left 40% (sticky), Right 60% (scrolls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Pane: Sticky 40% */}
        <aside
          id="speak-tray"
          aria-labelledby="speak-step"
          // Not sticky and not a scroll box of its own. As a fixed-height pane
          // with its own scrollbar it nested a scroll inside the page, cut the
          // Fan out button off at its bottom edge, and hid its own heading
          // when the guided tour scrolled it.
          className="lg:col-span-5 space-y-5 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper-sunk)] p-4 shadow-md sm:p-6"
        >
          <div className="border-b border-[var(--color-line)] pb-4">
            <StepLabel step="Step 1" label="Speak" />
            <h2 id="speak-step" className="font-display mt-0.5 text-lg font-semibold text-[var(--color-ink)]">
              One update, in your own words
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
              Hold your Wispr key and talk, or pick a sample below.
            </p>
          </div>
          <div id="fanout-controls" className="space-y-4">
            <SpeakBox
              value={spokenText}
              onChange={(val) => {
                setSpokenText(val);
                setSelectedDemoId(null);
              }}
              onSubmit={fanOut}
              disabled={busy}
            />

            {/* Stacked, each full width. Side by side in this column the
                project name was cut to "Diwali retail o". */}
            <div className="grid gap-3">
              <div>
                <label htmlFor="project" className="block text-xs font-medium text-[var(--color-ink-soft)]">
                  Project
                </label>
                <select
                  id="project"
                  value={project}
                  onChange={(event) => setProject(event.target.value)}
                  className="mt-1 w-full min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
                >
                  {PROJECTS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                  Contacts roster
                </span>
                <div
                  role="radiogroup"
                  aria-label="Contacts roster"
                  className="inline-flex w-full items-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-0.5"
                >
                  {Object.entries(rosterLabels).map(([value, label]) => {
                    const isSelected = contactSet === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setContactSet(value);
                          const matchingSample = demoUpdates.find((u) => u.contactSet === value);
                          if (matchingSample && isDemo) {
                            setSpokenText(matchingSample.spokenText);
                            setProject(matchingSample.project);
                            setSelectedDemoId(matchingSample.id);
                            setResult(null);
                          }
                        }}
                        className={`flex-1 min-h-11 inline-flex items-center justify-center rounded-md px-3 text-xs transition ${
                          isSelected
                            ? "bg-[var(--color-paper)] font-semibold text-[var(--color-ink)] shadow-xs"
                            : "font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                id="fanout-button"
                type="button"
                onClick={fanOut}
                disabled={busy}
                className="btn-pill btn-accent text-sm font-semibold disabled:opacity-60"
              >
                <span>{busy ? "Fanning out…" : "Fan out"}</span>
                <kbd className="btn-chip w-auto px-2 font-mono text-[10px] tracking-wider">⌘↵</kbd>
              </button>
            </div>

            {/* Samples belong to the demo teams; your own roster has none. */}
            {samples.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--color-ink-soft)]">Or try a sample update</p>
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
                      className={`min-h-11 inline-flex items-center rounded-full border px-3.5 text-xs transition ${
                        instantMode
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 font-bold text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]"
                          : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-sunk)] text-[var(--color-ink)]"
                      }`}
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {instantMode && (
            <div
              role="status"
              className="rounded-[var(--radius-card)] border-2 border-[var(--color-accent)] bg-[var(--color-accent-wash)] p-4 shadow-sm animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-[var(--color-ink)]">
                        Instant mode
                      </p>
                      <Badge tone="verified" animated>Cached 0 AI calls</Badge>
                    </div>
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
                        className="min-h-11 rounded-full border-2 border-[var(--color-accent)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)] transition transform active:scale-95 inline-flex items-center gap-1.5"
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
              className="rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-3 text-sm text-[var(--color-ink)] animate-fade-in"
            >
              {error}
            </p>
          )}

          {/* After a run: spoken text and extracted facts beneath it */}
          {result !== null && (
            <div className="space-y-4 pt-2">
              <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)] p-3 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={result.trailVerdict.ok ? "verified" : "blocked"} animated>
                    Trust trail {result.trailVerdict.ok ? "intact" : "broken"} · {result.trailVerdict.length} entries
                  </Badge>
                </div>
                <p className="text-[var(--color-ink-soft)] leading-relaxed">
                  You spoke {result.voiceReturn.wordsSpoken} words. SayOnce delivered{" "}
                  {result.voiceReturn.wordsDelivered} words to {result.voiceReturn.people} people
                  in {result.voiceReturn.languages}{" "}
                  {result.voiceReturn.languages === 1 ? "language" : "languages"}.
                  {result.voiceReturn.minutesSaved !== null &&
                    ` ~${result.voiceReturn.minutesSaved} minutes saved.`}
                </p>
              </div>

              <FactList
                facts={result.facts}
                spokenText={result.spokenText}
                highlightFactIds={highlight}
              />

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
                        className="min-h-11 rounded bg-[var(--color-ink)] px-3 py-1 font-semibold text-white hover:opacity-90 active-press transition"
                      >
                        Add {f.name} +
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Right Pane: Scrolls 60% */}
        <main className="lg:col-span-7 space-y-6 min-w-0">
          {busy && (
            <section aria-live="polite" aria-label="Fanning out drafts" className="space-y-4">
              <div className="h-14 animate-shimmer rounded-[var(--radius-card)] border border-[var(--color-rule)] p-4 flex items-center justify-between" />
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 animate-shimmer rounded" />
                    <div className="flex gap-2">
                      <div className="h-5 w-16 animate-shimmer rounded-full" />
                      <div className="h-5 w-20 animate-shimmer rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-4 w-full animate-shimmer rounded" />
                    <div className="h-4 w-5/6 animate-shimmer rounded" />
                    <div className="h-4 w-2/3 animate-shimmer rounded" />
                  </div>
                  <div className="pt-2 flex gap-2">
                    <div className="h-11 w-24 animate-shimmer rounded" />
                    <div className="h-11 w-32 animate-shimmer rounded" />
                  </div>
                </div>
              ))}
            </section>
          )}

          {result !== null && !busy && (
            <>
              {result.routing?.concernsNobody && (
                <div className="rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] p-4 text-sm text-[var(--color-ink-soft)]">
                  This update concerns nobody on the selected roster. No drafts were generated.
                </div>
              )}

              {(() => {
                // Parity's results row, computed from this fan-out alone.
                const drafted = result.cards.filter((c) => c.draft !== null);
                const passed = drafted.filter((c) => c.check?.ok === true).length;
                const withheld = result.facts.filter((f) => f.privacy.blockedFor.length > 0).length;
                const rate = drafted.length > 0 ? Math.round((passed / drafted.length) * 100) : 0;
                const prepared = result.mode === "instant" || result.cached === true;
                if (drafted.length === 0) return null;
                return (
                  <section aria-label="Fan-out summary" className="space-y-4">
                    <div className="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 shadow-sm sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--color-brand)]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)]">
                          {prepared ? "Prepared fan-out" : "Live fan-out"}
                        </span>
                        <span className="hidden text-xs text-[var(--color-ink-soft)] md:inline">
                          {prepared ? "(drafted and checked ahead of time)" : "(drafted just now, checked by code)"}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[var(--color-accent)]">
                        {drafted.length} drafts checked by code
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                      <CounterCard
                        label="Drafts"
                        meta="This update"
                        value={String(drafted.length)}
                        pill={{ icon: <Send size={12} strokeWidth={2.5} />, text: "Ready to send" }}
                        caption="One per person who needs to know"
                        footer="Each in its reader's own words"
                      />
                      <div className="hover-card-lift animate-fade-in flex flex-col justify-between rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-medium text-[var(--color-accent)]">Checker</span>
                          <span className="text-[var(--color-ink-soft)]">Deterministic</span>
                        </div>
                        <div className="mt-1">
                          <Gauge
                            value={rate}
                            label="Drafts passing the deterministic checker"
                            color={rate === 100 ? "var(--color-verified)" : "var(--color-brand)"}
                          />
                        </div>
                        <p className="mt-1 text-center text-[11px] font-medium text-[var(--color-ink-soft)]">
                          {passed} of {drafted.length} passed
                        </p>
                      </div>
                      <CounterCard
                        tone="blocked"
                        label="Withheld"
                        meta="Privacy Shield"
                        value={String(withheld)}
                        pill={{ icon: <Lock size={12} strokeWidth={2.5} />, text: "Kept back" }}
                        caption="Never handed to the blocked reader's draft"
                        footer="Enforced before the model runs"
                        delayMs={120}
                      />
                      <CounterCard
                        tone={drafted.length - passed > 0 ? "review" : "verified"}
                        label="Needs you"
                        meta="Before sending"
                        value={String(drafted.length - passed)}
                        pill={
                          drafted.length - passed > 0
                            ? { icon: <AlertTriangle size={12} strokeWidth={2.5} />, text: "Edit or override" }
                            : { icon: <CheckCircle2 size={12} strokeWidth={2.5} />, text: "All clear" }
                        }
                        caption="Drafts the checker held back"
                        footer="Send stays locked until resolved"
                        footerTone={drafted.length - passed > 0 ? "review" : "verified"}
                        delayMs={180}
                      />
                    </div>
                  </section>
                );
              })()}

              <section id="drafts-section" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
                  <div>
                    <StepLabel step="Step 2" label="Fan-out" />
                    <h2
                      className="font-display mt-0.5 text-xl font-semibold tracking-tight text-[var(--color-ink)]"
                    >
                      Drafted Messages ({result.cards.filter((c) => activeRecipients.includes(c.contact.id) && c.draft !== null).length})
                    </h2>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      Staggered cards fanned out with deterministic fact checks.
                    </p>
                  </div>
                  {sendableQueueItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowQueue(true)}
                      className="btn-pill btn-ink pr-5 text-xs font-semibold"
                    >
                      Send all ({sendableQueueItems.filter((q) => !q.isSent).length} pending) · Guided queue →
                    </button>
                  )}
                </div>

                <div className="space-y-4 stagger-children">
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
                </div>
              </section>

            </>
          )}

          {!result && !busy && (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-rule)] bg-[var(--color-surface-raised)]/40 p-12 text-center space-y-3">
              <p
                className="font-display text-xl font-semibold tracking-tight text-[var(--color-ink)]"
              >
                &ldquo;One update. Everyone who needs to know gets their own version.&rdquo;
              </p>
              <p className="text-xs text-[var(--color-ink-soft)] max-w-sm mx-auto leading-relaxed">
                Hold your Wispr key and speak into the console on the left, or pick one of the sample updates to test instant mode. Draft cards, fact-check outcomes, and knowledge routing will fan out here.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Full width under both panes. In the right pane alone the matrix showed
          three of five recipients, and the withheld-fact locks scrolled out of
          sight, while the left pane below the tray sat empty. */}
      {result !== null && !busy && (
        <div className="mt-8 space-y-6">
          {/* Collapsible Knowledge Matrix */}
          <details className="group rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 transition" open>
            <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between select-none">
              <span className="flex items-center gap-2">
                <span>Knowledge Matrix</span>
                <span className="text-xs text-[var(--color-ink-soft)] font-normal">
                  ({result.facts.length} facts × {result.cards.length} recipients)
                </span>
              </span>
              <span className="text-xs text-[var(--color-accent)] font-mono group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div id="knowledge-matrix-section" className="mt-4 pt-3 border-t border-[var(--color-rule)]">
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
          </details>

          {/* Collapsible Privacy Panel */}
          <details className="group rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 transition">
            <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between select-none">
              <span className="flex items-center gap-2">
                <span>🛡 Privacy Shield</span>
                <span className="text-xs text-[var(--color-ink-soft)] font-normal">
                  Deliberate omission rules
                </span>
              </span>
              <span className="text-xs text-[var(--color-accent)] font-mono group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div id="privacy-shield-section" className="mt-4 pt-3 border-t border-[var(--color-rule)]">
              <PrivacyPanel
                facts={result.facts}
                contacts={result.cards.map((c) => c.contact)}
              />
            </div>
          </details>

          {/* Collapsible Trust Trail */}
          <details className="group rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 transition">
            <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between select-none">
              <span className="flex items-center gap-2">
                <span>⛓ Trust Trail</span>
                <span className="text-xs text-[var(--color-ink-soft)] font-normal">
                  Cryptographic tamper-evident chain ({result.trail.length} entries)
                </span>
              </span>
              <span className="text-xs text-[var(--color-accent)] font-mono group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div id="trail-section" className="mt-4 pt-3 border-t border-[var(--color-rule)]">
              <TrustTrailViewer
                entries={result.trail}
                updateId={result.updateId}
              />
            </div>
          </details>
        </div>
      )}

      {showQueue && result && (
        <SendGuidedQueue
          items={sendableQueueItems}
          updateId={result.updateId}
          onClose={() => setShowQueue(false)}
          onToggleSent={handleToggleSent}
        />
      )}

      <CommandBar
        isOpen={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onExecute={handleExecuteCommand}
      />

      <GuidedTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        hasResult={result !== null}
        onEnsureResult={fanOut}
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
