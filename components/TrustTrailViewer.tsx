"use client";

import { useState } from "react";
import { Badge } from "./Badge";
import type { TrailEntry, TrailVerdict } from "@/lib/trail";

export interface TrustTrailViewerProps {
  entries: TrailEntry[];
  updateId: string;
}

function shortHash(hash: string): string {
  return hash ? hash.slice(0, 8) : "";
}

export function TrustTrailViewer({ entries, updateId }: TrustTrailViewerProps) {
  const [localEntries, setLocalEntries] = useState<TrailEntry[]>(entries);
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<TrailVerdict>({
    ok: true,
    length: entries.length,
  });
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleVerify(itemsToVerify = localEntries) {
    setVerifying(true);
    try {
      const res = await fetch("/api/trail/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: itemsToVerify }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerdict(data.verdict);
      }
    } catch (err) {
      console.warn("Failed to verify trail on server:", err);
    } finally {
      setVerifying(false);
    }
  }

  async function handleExportJson() {
    await navigator.clipboard.writeText(JSON.stringify(localEntries, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSimulateTamper() {
    if (localEntries.length === 0) return;
    const targetIndex = Math.min(2, localEntries.length - 1);
    const tampered = localEntries.map((e, idx) => {
      if (idx !== targetIndex) return e;
      return {
        ...e,
        payload: {
          ...(typeof e.payload === "object" && e.payload !== null ? e.payload : {}),
          _tampered: true,
          altered_at: new Date().toISOString(),
        },
      };
    });
    setLocalEntries(tampered);
    handleVerify(tampered);
    setIsOpen(true);
    setExpandedSeq(tampered[targetIndex]?.seq ?? null);
  }

  function handleResetTrail() {
    setLocalEntries(entries);
    setVerdict({ ok: true, length: entries.length });
  }

  const isIntact = verdict.ok;
  const brokenSeq = !verdict.ok ? verdict.brokenAtSeq : null;

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-paper-sunk)] text-xs font-mono font-bold">
            ⛓️
          </div>
          <h2 className="text-sm font-semibold">Trust Trail (Audit Log)</h2>
          <Badge tone={isIntact ? "verified" : "blocked"}>
            {isIntact
              ? `Chain intact · ${localEntries.length} entries verified`
              : `TAMPER DETECTED · Broken at #${brokenSeq}`}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            id="verify-trail-button"
            type="button"
            onClick={() => handleVerify()}
            disabled={verifying}
            className="rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-2.5 min-h-11 inline-flex items-center font-medium hover:bg-[var(--color-paper)] disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify trail"}
          </button>
          {process.env.NODE_ENV !== "production" && (
            <>
              {isIntact ? (
                <button
                  type="button"
                  onClick={handleSimulateTamper}
                  className="rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] px-2 min-h-11 inline-flex items-center font-medium text-[var(--color-ink)] hover:opacity-80"
                  title="Dev only: Simulates database payload tampering on entry #3 to verify detection"
                >
                  Simulate tamper
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetTrail}
                  className="rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-2 min-h-11 inline-flex items-center font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                >
                  Reset trail
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={handleExportJson}
            className="rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-2.5 min-h-11 inline-flex items-center font-medium hover:bg-[var(--color-paper)]"
          >
            {copied ? "Copied JSON!" : "Export trail (JSON)"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded px-2 min-h-11 inline-flex items-center font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            {isOpen ? "Hide entries ▲" : "Show entries ▼"}
          </button>
        </div>
      </div>

      {!isIntact && (
        <div className="rounded border border-[var(--color-blocked)]/40 bg-[var(--color-blocked-wash)] p-3 text-xs text-[var(--color-blocked)]">
          <strong>Tamper alert:</strong> {verdict.reason}
        </div>
      )}

      {isOpen && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-[var(--color-ink-soft)]">
            Every step is appended with a cryptographic SHA-256 hash chaining back to the genesis block.
            Update ID: <code className="font-mono text-[11px]">{updateId}</code>
          </p>

          <ol className="divide-y divide-[var(--color-rule)] border-t border-[var(--color-rule)] text-xs font-sans">
            {localEntries.map((entry) => {
              const isBrokenRow = !isIntact && entry.seq === brokenSeq;
              const isExpanded = expandedSeq === entry.seq;

              return (
                <li
                  key={`${entry.updateId}-${entry.seq}`}
                  className={`py-2 transition-colors ${
                    isBrokenRow ? "bg-[var(--color-blocked-wash)] p-2 rounded" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[var(--color-ink-soft)]">
                        #{entry.seq}
                      </span>
                      <span className="rounded bg-[var(--color-paper-sunk)] px-1.5 py-0.5 font-medium uppercase text-[10px]">
                        {entry.actor}
                      </span>
                      <span className="font-semibold text-[var(--color-ink)]">{entry.type}</span>
                      <span className="text-[11px] text-[var(--color-ink-soft)]">
                        {new Date(entry.at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[11px] text-[var(--color-ink-soft)]"
                        title={`Hash: ${entry.hash}\nPrev: ${entry.prevHash}`}
                      >
                        prev:{shortHash(entry.prevHash)} → hash:
                        <span className="font-bold text-[var(--color-ink)]">
                          {shortHash(entry.hash)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedSeq(isExpanded ? null : entry.seq)}
                        className="rounded px-1.5 py-0.5 text-[11px] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)] hover:text-[var(--color-ink)]"
                      >
                        {isExpanded ? "Collapse" : "Payload"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-[var(--color-paper-sunk)] p-2.5 font-mono text-[11px] leading-relaxed border border-[var(--color-rule)]">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
