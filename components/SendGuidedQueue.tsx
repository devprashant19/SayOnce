"use client";

import { useState } from "react";
import { Badge } from "./Badge";
import type { SendTarget } from "@/lib/links";
import type { Contact, Draft } from "@/lib/types";
import type { CheckOutcome } from "@/lib/checker";

export interface QueueItem {
  messageId: string;
  contact: Contact;
  draft: Draft;
  check: CheckOutcome | null;
  target: SendTarget;
  isSent: boolean;
  sentAt: string | null;
}

export interface SendGuidedQueueProps {
  items: QueueItem[];
  updateId?: string;
  onClose: () => void;
  onToggleSent: (messageId: string, nextSent: boolean) => Promise<void>;
}

export function SendGuidedQueue({
  items,
  updateId: _updateId,
  onClose,
  onToggleSent,
}: SendGuidedQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentMap, setSentMap] = useState<Record<string, { sent: boolean; sentAt: string | null }>>(
    () => {
      const initial: Record<string, { sent: boolean; sentAt: string | null }> = {};
      for (const item of items) {
        initial[item.messageId] = { sent: item.isSent, sentAt: item.sentAt };
      }
      return initial;
    },
  );

  if (items.length === 0) {
    return null;
  }

  const current = items[currentIndex]!;
  const currentSentInfo = sentMap[current.messageId] ?? { sent: false, sentAt: null };
  const isCurrentSent = currentSentInfo.sent;
  const totalSent = Object.values(sentMap).filter((s) => s.sent).length;
  const isAllDone = totalSent === items.length;

  async function handleSend(item: QueueItem) {
    const nowIso = new Date().toISOString();
    setSentMap((prev) => ({
      ...prev,
      [item.messageId]: { sent: true, sentAt: nowIso },
    }));
    await onToggleSent(item.messageId, true);
  }

  async function handleToggleSent(item: QueueItem) {
    const nextSent = !isCurrentSent;
    const nextSentAt = nextSent ? new Date().toISOString() : null;
    setSentMap((prev) => ({
      ...prev,
      [item.messageId]: { sent: nextSent, sentAt: nextSentAt },
    }));
    await onToggleSent(item.messageId, nextSent);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-queue-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
          <div>
            <div className="inline-block rounded bg-[var(--color-accent-wash)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
              Send All · Guided Queue
            </div>
            <h2 id="guided-queue-title" className="mt-1 text-lg font-semibold tracking-tight">
              Sending {currentIndex + 1} of {items.length}: {current.contact.name} ({current.contact.channel === "whatsapp" ? "WhatsApp" : "Email"})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)] hover:text-[var(--color-ink)]"
            aria-label="Close send queue"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--color-ink-soft)]">
            <span>Progress: {totalSent} of {items.length} sent</span>
            <span>{Math.round((totalSent / items.length) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-paper-sunk)]">
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${(totalSent / items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Recipient Card */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">{current.contact.name}</span>
              <span className="text-xs text-[var(--color-ink-soft)]">{current.contact.role}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge tone="neutral">{current.contact.language}</Badge>
              <Badge tone="neutral">
                {current.contact.channel === "whatsapp" ? "WhatsApp" : "Email"}
              </Badge>
              {isCurrentSent ? (
                <Badge tone="verified">✓ Sent</Badge>
              ) : (
                <Badge tone="neutral">Pending send</Badge>
              )}
            </div>
          </div>

          {current.draft.channel === "email" && current.draft.subject && (
            <div className="text-xs">
              <span className="font-medium text-[var(--color-ink)]">Subject: </span>
              <span className="text-[var(--color-ink-soft)]">{current.draft.subject}</span>
            </div>
          )}

          <div>
            <span className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
              Message Preview:
            </span>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-[var(--color-paper)] p-3 font-sans text-sm leading-relaxed border border-[var(--color-rule)]">
              {current.draft.body}
            </pre>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="min-h-11 rounded border border-[var(--color-rule)] px-3 text-sm font-medium hover:bg-[var(--color-paper-sunk)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={currentIndex === items.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
              className="min-h-11 rounded border border-[var(--color-rule)] px-3 text-sm font-medium hover:bg-[var(--color-paper-sunk)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>

          {/* On a phone these stack full width, the primary send action on
              top; side by side they wrapped "Open in Email ↗" onto two lines. */}
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => handleToggleSent(current)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--color-line)] px-4 text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)] sm:w-auto"
            >
              {isCurrentSent ? "Mark unsent" : "Mark as sent without link"}
            </button>

            {current.target.href ? (
              <a
                href={current.target.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  handleSend(current);
                  if (currentIndex < items.length - 1) {
                    setTimeout(() => setCurrentIndex((i) => i + 1), 500);
                  }
                }}
                className="btn-pill btn-accent w-full justify-center px-5 text-sm font-semibold sm:w-auto"
              >
                {isCurrentSent ? `Re-send: ${current.target.label} ↗` : `${current.target.label} ↗`}
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="min-h-11 w-full cursor-not-allowed rounded-full border border-[var(--color-line)] px-4 text-sm opacity-50 sm:w-auto"
              >
                Cannot send (missing info)
              </button>
            )}
          </div>
        </div>

        {/* Completion notice */}
        {isAllDone && (
          <div className="rounded border border-[var(--color-verified)]/30 bg-[var(--color-verified-wash)] p-3 text-center text-sm font-medium text-[var(--color-verified)]">
            All {items.length} messages have been sent! 🎉
          </div>
        )}
      </div>
    </div>
  );
}
