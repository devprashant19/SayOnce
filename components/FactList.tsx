"use client";

import { Badge } from "./Badge";
import type { Fact } from "@/lib/types";

/**
 * The extracted facts, shown above the cards.
 *
 * Keeping the original update and its facts on screen next to the drafts is
 * the cheapest possible defence against the thing judges will be looking for:
 * a tool that quietly makes things up. If the facts are visible, a wrong one
 * is caught by the person who spoke them.
 */
export function FactList({
  facts,
  spokenText,
  highlightFactIds,
}: {
  facts: Fact[];
  spokenText: string;
  highlightFactIds: string[] | null;
}) {
  const highlighted = facts.filter((f) => highlightFactIds?.includes(f.id));
  const spans = highlighted.map((f) => f.sourceSpan).sort((a, b) => a.start - b.start);

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-4">
      <h2 className="text-sm font-semibold">What you said</h2>
      <p className="mt-2 text-sm leading-relaxed">
        {spans.length === 0 ? spokenText : <Highlighted text={spokenText} spans={spans} />}
      </p>

      <h2 className="mt-4 text-sm font-semibold">
        Facts found <span className="font-normal text-[var(--color-ink-soft)]">({facts.length})</span>
      </h2>
      <ul className="mt-2 space-y-1.5 text-sm">
        {facts.map((fact) => (
          <li
            key={fact.id}
            className={`rounded px-2 py-1 ${
              highlightFactIds?.includes(fact.id) ? "bg-[var(--color-accent-wash)]" : ""
            }`}
          >
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">{fact.type}</Badge>
              <span>{fact.text}</span>
              {fact.privacy.blockedFor.length > 0 && (
                <Badge
                  tone="locked"
                  title={fact.privacy.reason || "You said this must not be shared."}
                >
                  locked from {fact.privacy.blockedFor.length}
                </Badge>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Highlighted({
  text,
  spans,
}: {
  text: string;
  spans: Array<{ start: number; end: number }>;
}) {
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  for (const [index, span] of spans.entries()) {
    if (span.start > cursor) pieces.push(text.slice(cursor, span.start));
    pieces.push(
      // A visible tint: the accent wash barely differed from this tray, so
      // the words a sentence came from did not appear to light up at all.
      <mark
        key={index}
        className="rounded bg-[color-mix(in_srgb,var(--color-brand)_24%,transparent)] px-0.5 text-[var(--color-ink)] transition-colors"
      >
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return <>{pieces}</>;
}
