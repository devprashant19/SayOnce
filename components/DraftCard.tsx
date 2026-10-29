"use client";

import { useState } from "react";
import { Badge } from "./Badge";
import type { CheckOutcome } from "@/lib/checker";
import type { Contact, Draft } from "@/lib/types";

/**
 * One card per reader.
 *
 * The card is where SayOnce's accuracy promise becomes visible: a "Facts
 * verified" badge when the deterministic checker passed, and a red panel
 * naming exactly what is wrong — with the send button disabled — when it did
 * not. A card that cannot be trusted must not be one tap from sending.
 */

export interface DraftCardProps {
  messageId?: string;
  updateId?: string;
  contact: Contact;
  draft: Draft | null;
  check: CheckOutcome | null;
  error: string | null;
  sendHref: string | null;
  sendLabel: string;
  sendBlockedReason: string | null;
  sent?: boolean;
  sentAt?: string | null;
  overridden?: boolean;
  onToggleSent?: (messageId: string, nextSent: boolean) => void | Promise<void>;
  onOverride?: (messageId: string) => void | Promise<void>;
  /** Highlights the spoken words a sentence came from. */
  onHoverSentence?: (factIds: string[] | null) => void;
  activeFactIds?: string[] | null;
  index: number;
}

export function DraftCard(props: DraftCardProps) {
  const { contact, draft, check, error } = props;
  const [copied, setCopied] = useState(false);
  const [body, setBody] = useState(draft?.body ?? "");
  const [isSent, setIsSent] = useState(props.sent ?? false);
  const [sentAt, setSentAt] = useState(props.sentAt ?? null);
  const [isOverridden, setIsOverridden] = useState(props.overridden ?? false);

  const failed = check !== null && !check.ok;
  const sendable = draft !== null && (!failed || isOverridden) && props.sendHref !== null;

  async function copy() {
    await navigator.clipboard.writeText(
      draft?.channel === "email" && draft.subject ? `${draft.subject}\n\n${body}` : body,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleSendClick() {
    if (!isSent && props.messageId && props.onToggleSent) {
      setIsSent(true);
      const nowIso = new Date().toISOString();
      setSentAt(nowIso);
      await props.onToggleSent(props.messageId, true);
    }
  }

  async function toggleSentManual() {
    if (!props.messageId || !props.onToggleSent) return;
    const nextSent = !isSent;
    setIsSent(nextSent);
    const nextSentAt = nextSent ? new Date().toISOString() : null;
    setSentAt(nextSentAt);
    await props.onToggleSent(props.messageId, nextSent);
  }

  async function handleOverride() {
    if (!props.messageId || !props.onOverride) return;
    setIsOverridden(true);
    await props.onOverride(props.messageId);
  }

  function formatSentTime(iso: string | null): string {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  return (
    <article
      className="fan-in rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4"
      style={{ animationDelay: `${Math.min(props.index, 8) * 60}ms` }}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{contact.name}</h3>
        <span className="text-sm text-[var(--color-ink-soft)]">{contact.role}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{contact.language}</Badge>
          <Badge tone="neutral">
            {contact.channel === "whatsapp" ? "WhatsApp" : "Email"}
          </Badge>
          {isSent && (
            <Badge tone="verified">
              ✓ Sent {formatSentTime(sentAt)}
            </Badge>
          )}
          {check?.ok && (
            <Badge
              tone="verified"
              title="Every number, date and name in this draft appears in what you said. Nothing withheld leaked. Language, script and length all match the profile."
            >
              Facts verified
            </Badge>
          )}
          {failed && !isOverridden && <Badge tone="blocked">Needs your eyes</Badge>}
          {failed && isOverridden && <Badge tone="neutral">Overridden</Badge>}
        </div>
      </header>

      {error !== null && (
        <p className="mt-3 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-3 text-sm">
          {error}
        </p>
      )}

      {failed && (
        <div className="mt-3 rounded border border-[var(--color-blocked)]/40 bg-[var(--color-blocked-wash)] p-3 text-sm space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-[var(--color-blocked)]">
              This draft is held back until you fix or override it:
            </p>
            {isOverridden ? (
              <span className="text-xs font-semibold text-[var(--color-ink-soft)]">
                ✓ Overridden by speaker
              </span>
            ) : (
              props.messageId && props.onOverride && (
                <button
                  type="button"
                  onClick={handleOverride}
                  className="rounded border border-[var(--color-blocked)]/60 bg-[var(--color-paper)] px-2.5 py-1 text-xs font-semibold text-[var(--color-blocked)] hover:bg-[var(--color-blocked-wash)]"
                >
                  Override and enable send
                </button>
              )
            )}
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {check.failures.map((failure, i) => (
              <li key={`${failure.code}-${i}`}>
                {failure.message}
                {failure.evidence && (
                  <span className="ml-1 line-through decoration-[var(--color-blocked)] font-medium">
                    {failure.evidence}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {draft !== null && (
        <>
          {draft.channel === "email" && draft.subject && (
            <p className="mt-3 text-sm">
              <span className="text-[var(--color-ink-soft)]">Subject: </span>
              <span className="font-medium">{draft.subject}</span>
            </p>
          )}

          <label htmlFor={`body-${contact.id}`} className="sr-only">
            Draft for {contact.name}
          </label>
          <textarea
            id={`body-${contact.id}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={Math.min(14, Math.max(4, body.split("\n").length + 2))}
            className="mt-2 w-full resize-y rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-3 text-sm leading-relaxed outline-none"
          />

          {draft.sentences.length > 0 && props.onHoverSentence && (
            <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
              Hover or tap a sentence below to see the words it came from.
            </p>
          )}
          {draft.sentences.length > 0 && props.onHoverSentence && (
            <ul className="mt-1 space-y-0.5 text-xs">
              {draft.sentences.map((sentence, i) => {
                const isSentenceActive =
                  props.activeFactIds &&
                  sentence.factIds.some((id) => props.activeFactIds!.includes(id));
                return (
                  <li
                    key={i}
                    onMouseEnter={() => props.onHoverSentence?.(sentence.factIds)}
                    onMouseLeave={() => props.onHoverSentence?.(null)}
                    onFocus={() => props.onHoverSentence?.(sentence.factIds)}
                    onBlur={() => props.onHoverSentence?.(null)}
                    onClick={() => props.onHoverSentence?.(sentence.factIds)}
                    tabIndex={0}
                    className={`cursor-default rounded px-1.5 py-0.5 transition-colors ${
                      isSentenceActive
                        ? "bg-[var(--color-accent-wash)] font-medium text-[var(--color-ink)]"
                        : "text-[var(--color-ink-soft)] hover:bg-[var(--color-accent-wash)] focus:bg-[var(--color-accent-wash)]"
                    }`}
                  >
                    {sentence.sentence}
                    {sentence.factIds.length === 0 && (
                      <span className="ml-1 text-[var(--color-ink-faint)]">(no fact)</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="min-h-11 rounded border border-[var(--color-rule)] px-3 text-sm font-medium hover:bg-[var(--color-paper-sunk)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            {sendable ? (
              <a
                href={props.sendHref ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleSendClick}
                className={`min-h-11 content-center rounded px-3 text-sm font-medium ${
                  isSent
                    ? "border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                    : "bg-[var(--color-accent)] text-white hover:opacity-90"
                }`}
              >
                {isSent ? `Re-send (${props.sendLabel})` : props.sendLabel}
              </a>
            ) : (
              <button
                type="button"
                disabled
                title={
                  props.sendBlockedReason ??
                  "Fix the issues above, or override, before sending."
                }
                className="min-h-11 cursor-not-allowed rounded border border-[var(--color-rule)] px-3 text-sm font-medium opacity-50"
              >
                {props.sendLabel}
              </button>
            )}
            {props.messageId && props.onToggleSent && (
              <button
                type="button"
                onClick={toggleSentManual}
                className="min-h-11 rounded border border-[var(--color-rule)] px-3 text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)] hover:text-[var(--color-ink)]"
              >
                {isSent ? "Mark unsent" : "Mark as sent"}
              </button>
            )}
            {isSent && (
              <span className="text-xs font-medium text-[var(--color-verified)]">
                ✓ Sent {formatSentTime(sentAt)}
              </span>
            )}
            {props.sendBlockedReason !== null && (
              <span className="text-xs text-[var(--color-ink-soft)]">
                {props.sendBlockedReason}
              </span>
            )}
          </div>
        </>
      )}
    </article>
  );
}
