"use client";

import { useState } from "react";
import type { ContradictionAlert } from "@/lib/consistency";

export interface ContradictionBannerProps {
  alerts: ContradictionAlert[];
  updateId: string;
  onApplyCorrection?: (alert: ContradictionAlert) => void;
}

export function ContradictionBanner({
  alerts,
  updateId,
  onApplyCorrection,
}: ContradictionBannerProps) {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const pending = alerts.filter((a) => !resolvedIds.includes(a.id));
  if (pending.length === 0) return null;

  async function handleChoice(
    alert: ContradictionAlert,
    choice: "add-correction" | "ignore" | "supersede",
  ) {
    setActingId(alert.id);
    try {
      const res = await fetch("/api/consistency/choice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          updateId,
          contradictionId: alert.id,
          choice,
          alert,
        }),
      });

      if (res.ok) {
        if (choice === "add-correction" && onApplyCorrection) {
          onApplyCorrection(alert);
        }
        setResolvedIds((prev) => [...prev, alert.id]);
      }
    } catch (err) {
      console.warn("Failed to record consistency choice:", err);
    } finally {
      setActingId(null);
    }
  }

  return (
    <section aria-live="polite" className="space-y-3">
      {pending.map((alert) => (
        <div
          key={alert.id}
          className="rounded-[var(--radius-card)] border border-[var(--color-warning)] bg-[var(--color-warning-wash)] p-4 text-xs space-y-2.5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <h3 className="font-semibold text-[var(--color-ink)]">
                Consistency Guard: Past update contradiction detected
              </h3>
            </div>
            <span className="rounded bg-[var(--color-paper)] px-2 py-0.5 font-medium text-[var(--color-ink)] border border-[var(--color-rule)]">
              Topic: {alert.topic} · Recipient: {alert.recipientName}
            </span>
          </div>

          <p className="text-[var(--color-ink)] leading-relaxed">
            Earlier on {alert.previousSpokenOn} you told {alert.recipientName}: &quot;
            <span className="font-medium">{alert.previousFactText}</span>
            &quot;. This update says: &quot;
            <span className="font-medium">{alert.currentFactText}</span>&quot;.
          </p>

          <div className="rounded bg-[var(--color-paper)] p-2.5 border border-[var(--color-rule)] space-y-1">
            <span className="font-semibold text-[var(--color-ink-soft)]">
              Suggested correction line:
            </span>
            <p className="font-medium text-[var(--color-ink)]">
              &quot;{alert.suggestedCorrection}&quot;
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={actingId === alert.id}
              onClick={() => handleChoice(alert, "add-correction")}
              className="rounded bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              Add correction line →
            </button>
            <button
              type="button"
              disabled={actingId === alert.id}
              onClick={() => handleChoice(alert, "supersede")}
              className="rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1.5 font-medium hover:bg-[var(--color-paper-sunk)] disabled:opacity-50"
            >
              Mark earlier fact superseded
            </button>
            <button
              type="button"
              disabled={actingId === alert.id}
              onClick={() => handleChoice(alert, "ignore")}
              className="rounded px-2.5 py-1.5 font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-50"
            >
              Ignore
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

