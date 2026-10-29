"use client";

import { useCallback, useState } from "react";
import { SpeakBox } from "@/components/SpeakBox";
import { DraftCard } from "@/components/DraftCard";
import { FactList } from "@/components/FactList";
import { KnowledgeMatrix } from "@/components/KnowledgeMatrix";
import { PrivacyPanel } from "@/components/PrivacyPanel";
import { TrustTrailViewer } from "@/components/TrustTrailViewer";
import { SendGuidedQueue, type QueueItem } from "@/components/SendGuidedQueue";
import { Badge } from "@/components/Badge";
import { sendTargetFor } from "@/lib/links";
import { CONTACT_SET_LABELS } from "@/lib/contact-sets";
import type { Contact, Draft, Fact } from "@/lib/types";
import type { CheckOutcome } from "@/lib/checker";
import type { VoiceReturn } from "@/lib/voice-return";
import type { TrailEntry } from "@/lib/trail";
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
  voiceReturn: VoiceReturn;
  trail: TrailEntry[];
  trailVerdict: { ok: boolean; length: number };
}

const PROJECTS = ["Diwali retail order", "Warehouse shift", "Q4 export run", "Other"];

export default function SpeakPage() {
  const [spokenText, setSpokenText] = useState("");
  const [project, setProject] = useState(PROJECTS[0]!);
  const [contactSet, setContactSet] = useState("india");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FanoutResponse | null>(null);
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const [activeRecipients, setActiveRecipients] = useState<string[]>([]);
  const [showQueue, setShowQueue] = useState(false);

  const fanOut = useCallback(async () => {
    if (spokenText.trim().length === 0) {
      setError("Say something first — hold your Wispr key and talk.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/fanout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spokenText, project, contactSet }),
      });
      const payload = (await response.json()) as FanoutResponse | { error: string };
      if (!response.ok) {
        setError("error" in payload ? payload.error : "Fan out failed. Try again.");
        return;
      }
      const fanoutData = payload as FanoutResponse;
      setResult(fanoutData);
      const activeIds = fanoutData.cards.filter((c) => c.draft !== null).map((c) => c.contact.id);
      setActiveRecipients(activeIds);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [spokenText, project, contactSet]);

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
        <h1 className="text-2xl font-semibold tracking-tight">Speak</h1>
        <p className="mt-1 text-[var(--color-ink-soft)]">
          One update. Everyone who needs to know gets their own version.
        </p>

        <div className="mt-6 space-y-4">
          <SpeakBox
            value={spokenText}
            onChange={setSpokenText}
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
                  }}
                  className="rounded-full border border-[var(--color-rule)] px-3 py-1.5 text-xs hover:bg-[var(--color-paper-sunk)]"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error !== null && (
          <p
            role="alert"
            className="mt-4 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-3 text-sm"
          >
            {error}
          </p>
        )}
      </section>

      {busy && (
        <section aria-live="polite" className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-paper-sunk)]"
            />
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

          <section className="flex flex-wrap items-center gap-2 text-sm">
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

          <section className="space-y-3">
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

          <PrivacyPanel
            facts={result.facts}
            contacts={result.cards.map((c) => c.contact)}
          />

          <TrustTrailViewer
            entries={result.trail}
            updateId={result.updateId}
          />

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
    </div>
  );
}
