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
  contact: Contact;
  draft: Draft | null;
  check: CheckOutcome | null;
  error: string | null;
  sendHref: string | null;
  sendLabel: string;
  sendBlockedReason: string | null;
  /** Highlights the spoken words a sentence came from. */
  onHoverSentence?: (factIds: string[] | null) => void;
  index: number;
}

export function DraftCard(props: DraftCardProps) {
  const { contact, draft, check, error } = props;
  const [copied, setCopied] = useState(false);
  const [body, setBody] = useState(draft?.body ?? "");

  const failed = check !== null && !check.ok;
  const sendable = draft !== null && !failed && props.sendHref !== null;

  async function copy() {
    await navigator.clipboard.writeText(
      draft?.channel === "email" && draft.subject ? `${draft.subject}\n\n${body}` : body,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
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
          {check?.ok && (
            <Badge
              tone="verified"
              title="Every number, date and name in this draft appears in what you said. Nothing withheld leaked. Language, script and length all match the profile."
            >
              Facts verified
            </Badge>
          )}
          {failed && <Badge tone="blocked">Needs your eyes</Badge>}
        </div>
      </header>

      {error !== null && (
        <p className="mt-3 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-3 text-sm">
          {error}
        </p>
      )}

      {failed && (
        <div className="mt-3 rounded border border-[var(--color-blocked)]/40 bg-[var(--color-blocked-wash)] p-3 text-sm">
          <p className="font-medium">
            This draft is held back until you fix or override it:
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {check.failures.map((failure, i) => (
              <li key={`${failure.code}-${i}`}>
                {failure.message}
                {failure.evidence && (
                  <span className="ml-1 line-through decoration-[var(--color-blocked)]">
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
              Hover a sentence below to see the words it came from.
            </p>
          )}
          {draft.sentences.length > 0 && props.onHoverSentence && (
            <ul className="mt-1 space-y-0.5 text-xs">
              {draft.sentences.map((sentence, i) => (
                <li
                  key={i}
                  onMouseEnter={() => props.onHoverSentence?.(sentence.factIds)}
                  onMouseLeave={() => props.onHoverSentence?.(null)}
                  onFocus={() => props.onHoverSentence?.(sentence.factIds)}
                  onBlur={() => props.onHoverSentence?.(null)}
                  tabIndex={0}
                  className="cursor-default rounded px-1 py-0.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-accent-wash)] focus:bg-[var(--color-accent-wash)]"
                >
                  {sentence.sentence}
                  {sentence.factIds.length === 0 && (
                    <span className="ml-1 text-[var(--color-ink-faint)]">(no fact)</span>
                  )}
                </li>
              ))}
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
                className="min-h-11 content-center rounded bg-[var(--color-accent)] px-3 text-sm font-medium text-white"
              >
                {props.sendLabel}
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
