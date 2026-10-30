"use client";

import { useMemo } from "react";
import type { Contact, Fact, Draft } from "@/lib/types";
import type { CheckOutcome } from "@/lib/checker";

export interface KnowledgeMatrixProps {
  facts: Fact[];
  contacts: Contact[];
  cards: Array<{
    contact: Contact;
    draft: Draft | null;
    check: CheckOutcome | null;
  }>;
  activeContactIds?: string[];
  onToggleContact?: (contactId: string) => void;
  onHighlightFact?: (factId: string | null) => void;
}

export function KnowledgeMatrix({
  facts,
  contacts,
  cards,
  activeContactIds,
  onToggleContact,
  onHighlightFact,
}: KnowledgeMatrixProps) {
  const cardMap = useMemo(() => {
    return new Map(cards.map((c) => [c.contact.id, c]));
  }, [cards]);

  const activeSet = useMemo(() => {
    return new Set(activeContactIds ?? cards.filter((c) => c.draft !== null).map((c) => c.contact.id));
  }, [activeContactIds, cards]);

  if (facts.length === 0 || contacts.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Knowledge Matrix</h3>
          <p className="text-xs text-[var(--color-ink-soft)]">
            Who gets which fact. Checkboxes toggle draft delivery; click cells to trace sentences.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--color-ink-soft)]">
          <span className="flex items-center gap-1">
            <span className="font-bold text-[var(--color-verified)]">✓</span> Told
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--color-blocked)]">🔒</span> Deliberately withheld
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--color-ink-faint)]">—</span> Not relevant
          </span>
        </div>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Knowledge matrix, scrolls horizontally"
        className="relative overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)]"
      >
        <table className="w-full min-w-[500px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper-sunk)]">
              <th className="sticky left-0 z-20 w-48 min-w-[180px] bg-[var(--color-paper-sunk)] p-2.5 font-semibold">
                Fact
              </th>
              {contacts.map((contact) => {
                const isSelected = activeSet.has(contact.id);
                return (
                  <th
                    key={contact.id}
                    className="p-2.5 text-center font-medium whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center gap-1">
                      {onToggleContact ? (
                        <label className="flex min-h-11 cursor-pointer items-center gap-1.5 px-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleContact(contact.id)}
                            className="h-4 w-4 rounded border-[var(--color-rule)] accent-[var(--color-accent)]"
                            aria-label={`Toggle message for ${contact.name}`}
                          />
                          <span className="font-semibold">{contact.name}</span>
                        </label>
                      ) : (
                        <span className="font-semibold">{contact.name}</span>
                      )}
                      <span className="text-[10px] text-[var(--color-ink-faint)]">{contact.role}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-rule)]">
            {facts.map((fact) => {
              return (
                <tr
                  key={fact.id}
                  className="hover:bg-[var(--color-paper-sunk)]/50 transition-colors"
                  onMouseEnter={() => onHighlightFact?.(fact.id)}
                  onMouseLeave={() => onHighlightFact?.(null)}
                >
                  <td className="sticky left-0 z-10 bg-[var(--color-paper)] p-2.5 font-medium leading-tight">
                    <div className="flex items-start gap-1.5">
                      <span className="rounded bg-[var(--color-rule)]/40 px-1 py-0.5 text-[10px] text-[var(--color-ink-soft)] font-mono">
                        {fact.id}
                      </span>
                      <span className="line-clamp-2">{fact.text}</span>
                    </div>
                  </td>
                  {contacts.map((contact) => {
                    const isSelected = activeSet.has(contact.id);
                    const isBlocked = fact.privacy.blockedFor.includes(contact.id);
                    const card = cardMap.get(contact.id);
                    const isTold =
                      isSelected &&
                      card?.draft !== null &&
                      (card?.draft.usedFactIds.includes(fact.id) ||
                        card?.draft.sentences.some((s) => s.factIds.includes(fact.id)));

                    let content = <span className="text-[var(--color-ink-faint)]">—</span>;
                    let title = "Not relevant";

                    if (isBlocked) {
                      content = (
                        <span className="inline-flex items-center text-sm" role="img" aria-label="Withheld">
                          🔒
                        </span>
                      );
                      title = `Withheld by Privacy Shield: ${fact.privacy.reason || "Explicit instruction"}`;
                    } else if (isTold) {
                      content = (
                        <span className="font-bold text-base text-[var(--color-verified)]" aria-label="Told">
                          ✓
                        </span>
                      );
                      const matchingSentence = card?.draft?.sentences.find((s) =>
                        s.factIds.includes(fact.id),
                      );
                      title = matchingSentence
                        ? `Carried by: "${matchingSentence.sentence}"`
                        : "Told in this message";
                    }

                    return (
                      <td
                        key={contact.id}
                        className="p-2 text-center"
                        title={title}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

