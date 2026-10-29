"use client";

import { Badge } from "./Badge";
import type { Contact, Fact } from "@/lib/types";

export interface PrivacyPanelProps {
  facts: Fact[];
  contacts: Contact[];
}

export function PrivacyPanel({ facts, contacts }: PrivacyPanelProps) {
  const lockedFacts = facts.filter((f) => f.privacy.blockedFor.length > 0);

  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-verified-wash)] text-xs text-[var(--color-verified)] font-bold">
            🛡️
          </div>
          <h2 className="text-sm font-semibold">Privacy Shield</h2>
          <Badge tone={lockedFacts.length > 0 ? "locked" : "verified"}>
            {lockedFacts.length > 0
              ? `${lockedFacts.length} ${lockedFacts.length === 1 ? "lock active" : "locks active"}`
              : "All facts public to roster"}
          </Badge>
        </div>
        <span className="text-xs text-[var(--color-ink-soft)]">
          Zero bytes of withheld facts reach Compose
        </span>
      </div>

      {lockedFacts.length === 0 ? (
        <p className="text-xs text-[var(--color-ink-soft)]">
          No withheld facts or standing privacy restrictions detected in this update.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-rule)] text-xs">
          {lockedFacts.map((fact) => {
            const blockedContacts = fact.privacy.blockedFor
              .map((id) => contactMap.get(id)?.name ?? id)
              .join(", ");

            return (
              <li key={fact.id} className="py-2.5 space-y-1.5 first:pt-1 last:pb-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--color-ink)]">Speaker&apos;s lock rule:</span>
                    <span className="rounded bg-[var(--color-paper-sunk)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-ink)]">
                      &quot;{fact.privacy.reason || fact.text}&quot;
                    </span>
                  </div>
                  <Badge tone="locked">Withheld from: {blockedContacts}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[var(--color-ink-soft)]">
                  <span>Protected fact:</span>
                  <span className="italic text-[var(--color-ink)]">&quot;{fact.text}&quot;</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
