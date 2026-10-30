"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Badge } from "@/components/Badge";
import type { UpdateLogRow } from "@/lib/update-repo";
import type { TrailEntry, TrailVerdict } from "@/lib/trail";

interface Metrics {
  totalUpdates: number;
  totalSpokenWords: number;
  totalDeliveredWords: number;
  amplification: number;
  totalMinutesSaved: number;
  openCommitmentsCount: number;
}

export default function LogPage() {
  const [updates, setUpdates] = useState<UpdateLogRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedContact, setSelectedContact] = useState("all");
  const [tab, setTab] = useState<"updates" | "commitments">("updates");

  // Trail drawer state
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateLogRow | null>(null);
  const [trailEntries, setTrailEntries] = useState<TrailEntry[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);
  const [trailVerdict, setTrailVerdict] = useState<TrailVerdict | null>(null);
  const [trailVerifiedAnimation, setTrailVerifiedAnimation] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    async function loadLog() {
      try {
        const res = await fetch("/api/updates");
        if (res.ok) {
          const data = await res.json();
          setUpdates(data.updates ?? []);
          setMetrics(data.metrics ?? null);
        }
      } catch (err) {
        console.warn("Failed to load updates:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLog();
  }, []);

  // Focus trap & Escape listener for trail timeline drawer
  useEffect(() => {
    if (!selectedUpdate) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDrawer();
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedUpdate]);

  function closeDrawer() {
    setSelectedUpdate(null);
    setTrailVerdict(null);
    setTrailVerifiedAnimation(false);
    triggerRef.current?.focus();
  }

  const projects = useMemo(() => {
    const set = new Set<string>();
    for (const u of updates) {
      if (u.project) set.add(u.project);
    }
    return Array.from(set).sort();
  }, [updates]);

  const contacts = useMemo(() => {
    const set = new Set<string>();
    for (const u of updates) {
      for (const m of u.messages) {
        if (m.contactId) set.add(m.contactId);
      }
    }
    return Array.from(set).sort();
  }, [updates]);

  const filteredUpdates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return updates.filter((u) => {
      if (selectedProject !== "all" && u.project !== selectedProject) return false;
      if (
        selectedContact !== "all" &&
        !u.messages.some((m) => m.contactId === selectedContact)
      ) {
        return false;
      }
      if (q) {
        const matchRaw = u.rawText.toLowerCase().includes(q);
        const matchSummary = u.summary.toLowerCase().includes(q);
        const matchDecisions = u.decisions.some((d) => d.toLowerCase().includes(q));
        if (!matchRaw && !matchSummary && !matchDecisions) return false;
      }
      return true;
    });
  }, [updates, selectedProject, selectedContact, search]);

  const allCommitments = useMemo(() => {
    const list: Array<{
      factId: string;
      updateId: string;
      project: string;
      spokenOn: string;
      owner: string;
      due: string | null;
      text: string;
      status: string;
    }> = [];

    for (const u of updates) {
      for (const f of u.facts) {
        if (f.type === "commitment" || f.commitmentStatus) {
          list.push({
            factId: f.id,
            updateId: u.id,
            project: u.project,
            spokenOn: u.spokenOn,
            owner: f.commitmentOwner ?? "Speaker",
            due: f.commitmentDue ?? null,
            text: f.text,
            status: f.commitmentStatus ?? "open",
          });
        }
      }
    }
    return list;
  }, [updates]);

  async function handleOpenTrail(update: UpdateLogRow, triggerEl?: HTMLElement) {
    if (triggerEl) triggerRef.current = triggerEl;
    setSelectedUpdate(update);
    setTrailLoading(true);
    setTrailVerdict(null);
    setTrailVerifiedAnimation(false);
    try {
      const res = await fetch("/api/trail/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updateId: update.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrailEntries(data.entries ?? []);
        setTrailVerdict(data.verdict ?? null);
      }
    } catch (err) {
      console.warn("Failed to fetch trail:", err);
    } finally {
      setTrailLoading(false);
    }
  }

  async function handleVerifyTrailClick() {
    if (!selectedUpdate || trailEntries.length === 0) return;
    setTrailLoading(true);
    try {
      const res = await fetch("/api/trail/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: trailEntries }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrailVerdict(data.verdict);
        if (data.verdict?.ok) {
          setTrailVerifiedAnimation(true);
        }
      }
    } catch (err) {
      console.warn("Failed to verify trail:", err);
    } finally {
      setTrailLoading(false);
    }
  }

  function handleExportCsv() {
    const headers = [
      "Date",
      "Time",
      "Project",
      "Summary",
      "Decisions",
      "Recipients",
      "Sent_Count",
      "Spoken_Text",
    ];

    const rows = filteredUpdates.map((u) => {
      const recipients = u.messages.map((m) => m.contactId).join("; ");
      const sentCount = `${u.messages.filter((m) => m.sent).length}/${u.messages.length}`;
      const decisions = u.decisions.join(" | ");

      return [
        `"${u.spokenOn}"`,
        `"${new Date(u.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}"`,
        `"${u.project.replace(/"/g, '""')}"`,
        `"${u.summary.replace(/"/g, '""')}"`,
        `"${decisions.replace(/"/g, '""')}"`,
        `"${recipients}"`,
        `"${sentCount}"`,
        `"${u.rawText.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sayonce-update-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            Audit Ledger
          </span>
          <h1
            className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-ink)]"
          >
            The Record Nobody Used to Keep
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            Every spoken update automatically logs its structured summary, decisions, recipient copies, and cryptographic hash chain.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredUpdates.length === 0}
          className="min-h-11 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-raised)] active-press transition disabled:opacity-50"
        >
          <span>Export CSV</span>
          <span className="font-mono">↓</span>
        </button>
      </div>

      {/* Aggregate Stats */}
      {metrics && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="hover-card-lift rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-1">
            <span className="text-xs font-medium text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
              Total Updates
            </span>
            <p
              className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink)]"
            >
              {metrics.totalUpdates}
            </p>
          </div>
          <div className="hover-card-lift rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-1">
            <span className="text-xs font-medium text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
              Amplification
            </span>
            <p
              className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-accent)]"
            >
              {metrics.amplification}×
            </p>
            <span className="block font-mono text-[11px] text-[var(--color-ink-soft)]">
              {metrics.totalSpokenWords} spoke → {metrics.totalDeliveredWords} delivered
            </span>
          </div>
          <div className="hover-card-lift rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-1">
            <span className="text-xs font-medium text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
              Time Saved
            </span>
            <p
              className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-verified)]"
            >
              ~{metrics.totalMinutesSaved}m
            </p>
            <span className="block text-[11px] text-[var(--color-ink-soft)]">
              vs manual update drafting
            </span>
          </div>
          <div className="hover-card-lift rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-1">
            <span className="text-xs font-medium text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
              Open Commitments
            </span>
            <p
              className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink)]"
            >
              {allCommitments.filter((c) => c.status === "open").length}
            </p>
            <span className="block text-[11px] text-[var(--color-ink-soft)]">
              Tracked across projects
            </span>
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[var(--color-rule)] text-sm">
        <button
          type="button"
          onClick={() => setTab("updates")}
          className={`min-h-11 inline-flex items-center pb-2.5 font-semibold transition-colors border-b-2 -mb-px ${
            tab === "updates"
              ? "border-[var(--color-accent)] text-[var(--color-ink)]"
              : "border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          }`}
        >
          Updates Ledger ({filteredUpdates.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("commitments")}
          className={`min-h-11 inline-flex items-center pb-2.5 font-semibold transition-colors border-b-2 -mb-px ${
            tab === "commitments"
              ? "border-[var(--color-accent)] text-[var(--color-ink)]"
              : "border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          }`}
        >
          Open Commitments ({allCommitments.filter((c) => c.status === "open").length})
        </button>
      </div>

      {tab === "updates" && (
        <section className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-3 text-xs">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search raw text, summary, decisions…"
              className="min-h-11 flex-1 min-w-[200px] rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
            />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)]"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)]"
            >
              <option value="all">All Recipients</option>
              {contacts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Real semantic table with zebra rows on surface-raised */}
          {loading ? (
            <div className="py-12 text-center text-sm font-mono text-[var(--color-ink-soft)]">
              Loading records…
            </div>
          ) : filteredUpdates.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-12 text-center text-xs text-[var(--color-ink-soft)]">
              No updates match the selected filters.
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label="Update ledger table, scrolls horizontally"
              className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-sm"
            >
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <caption className="sr-only">Update Log Ledger</caption>
                <thead className="border-b border-[var(--color-rule)] bg-[var(--color-surface-raised)] font-mono text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
                  <tr>
                    <th scope="col" className="py-3 px-4 font-semibold">Date &amp; Time</th>
                    <th scope="col" className="py-3 px-4 font-semibold">Project</th>
                    <th scope="col" className="py-3 px-4 font-semibold">Summary &amp; Decisions</th>
                    <th scope="col" className="py-3 px-4 font-semibold">Recipients &amp; Status</th>
                    <th scope="col" className="py-3 px-4 text-right font-semibold">Trust Trail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {filteredUpdates.map((u) => {
                    const sentCount = u.messages.filter((m) => m.sent).length;
                    const totalMsg = u.messages.length;

                    return (
                      <tr
                        key={u.id}
                        onClick={(e) => handleOpenTrail(u, e.currentTarget)}
                        className="even:bg-[var(--color-surface-raised)]/40 hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer min-h-[52px]"
                      >
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          <span className="font-mono font-medium text-[var(--color-ink)]">
                            {u.spokenOn}
                          </span>
                          <span className="block font-mono text-[11px] text-[var(--color-ink-soft)]">
                            {new Date(u.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <span className="inline-block rounded bg-[var(--color-surface-raised)] px-2 py-0.5 font-medium text-[var(--color-ink)] border border-[var(--color-rule)]">
                            {u.project || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top space-y-1">
                          <p className="font-medium text-[var(--color-ink)] leading-snug">
                            {u.summary || u.rawText.slice(0, 90) + "…"}
                          </p>
                          {u.decisions.length > 0 && (
                            <ul className="list-disc pl-4 text-[11px] text-[var(--color-ink-soft)] space-y-0.5">
                              {u.decisions.slice(0, 2).map((d, idx) => (
                                <li key={idx}>{d}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top whitespace-nowrap space-y-1.5">
                          {/* Stacked avatars */}
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {u.messages.slice(0, 4).map((m, idx) => {
                                const initial = (m.contactId || "?")[0]?.toUpperCase();
                                return (
                                  <div
                                    key={idx}
                                    title={m.contactId}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-wash)] text-[var(--color-accent)] ring-2 ring-[var(--color-paper)] font-mono text-[10px] font-bold border border-[var(--color-accent)]/20"
                                  >
                                    {initial}
                                  </div>
                                );
                              })}
                              {u.messages.length > 4 && (
                                <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-paper-sunk)] text-[var(--color-ink-soft)] ring-2 ring-[var(--color-paper)] font-mono text-[9px] font-bold">
                                  +{u.messages.length - 4}
                                </div>
                              )}
                            </div>
                            <Badge tone={sentCount === totalMsg && totalMsg > 0 ? "verified" : "locked"}>
                              {sentCount}/{totalMsg} sent
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTrail(u, e.currentTarget);
                            }}
                            className="min-h-11 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)] active-press transition"
                          >
                            <span>Verify ⛓️</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "commitments" && (
        <section className="space-y-4">
          <p className="text-xs text-[var(--color-ink-soft)]">
            Commitments extracted from spoken updates with their responsible owner and target due date.
          </p>

          {allCommitments.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-8 text-center text-xs text-[var(--color-ink-soft)]">
              No commitments found in past updates.
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label="Commitments table, scrolls horizontally"
              className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-sm"
            >
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <caption className="sr-only">Commitments Ledger</caption>
                <thead className="border-b border-[var(--color-rule)] bg-[var(--color-surface-raised)] font-mono text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
                  <tr>
                    <th scope="col" className="py-3 px-4 font-semibold">Owner</th>
                    <th scope="col" className="py-3 px-4 font-semibold">Commitment / Promise</th>
                    <th scope="col" className="py-3 px-4 font-semibold">Due Date</th>
                    <th scope="col" className="py-3 px-4 font-semibold">Project</th>
                    <th scope="col" className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {allCommitments.map((c) => (
                    <tr key={c.factId} className="even:bg-[var(--color-surface-raised)]/40 hover:bg-[var(--color-surface-raised)] transition min-h-[52px]">
                      <td className="py-3 px-4 align-top font-semibold text-[var(--color-ink)]">
                        {c.owner}
                      </td>
                      <td className="py-3 px-4 align-top font-medium text-[var(--color-ink)]">
                        &ldquo;{c.text}&rdquo;
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap font-mono text-[var(--color-ink)]">
                        {c.due ?? "Unscheduled"}
                      </td>
                      <td className="py-3 px-4 align-top text-[var(--color-ink-soft)]">
                        {c.project || "General"}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <Badge tone={c.status === "open" ? "locked" : "verified"}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Trail Timeline Drawer with .animate-slide-in-right */}
      {selectedUpdate && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop veil */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity animate-fade-in"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trail-drawer-title"
            tabIndex={-1}
            className="animate-slide-in-right relative z-10 w-full max-w-xl bg-[var(--color-paper)] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-[var(--color-rule)]"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--color-ink-soft)] font-medium">
                      {selectedUpdate.spokenOn}
                    </span>
                    <Badge tone="neutral">{selectedUpdate.project || "General"}</Badge>
                  </div>
                  <h2
                    id="trail-drawer-title"
                    className="font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)] mt-1"
                  >
                    Cryptographic Trail
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)] active-press transition"
                  aria-label="Close trail drawer"
                >
                  ✕
                </button>
              </div>

              {/* Summary & Spoken Word */}
              <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-4 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-[var(--color-ink)]">Summary:</span>
                  <p className="text-[var(--color-ink-soft)] mt-0.5 leading-relaxed">{selectedUpdate.summary}</p>
                </div>
                <div>
                  <span className="font-semibold text-[var(--color-ink)]">Raw spoken text:</span>
                  <p className="font-mono text-[11px] text-[var(--color-ink-soft)] mt-0.5 leading-relaxed italic">
                    &ldquo;{selectedUpdate.rawText}&rdquo;
                  </p>
                </div>
              </div>

              {/* Verify Trail Button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleVerifyTrailClick}
                  disabled={trailLoading || trailEntries.length === 0}
                  className="min-h-11 inline-flex items-center gap-2 rounded bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-on-accent)] shadow-sm hover:opacity-90 active-press transition disabled:opacity-50"
                >
                  <span>{trailLoading ? "Verifying hashes…" : "Verify trail"}</span>
                  <span className="font-mono">⛓</span>
                </button>

                {trailVerdict && (
                  <Badge tone={trailVerdict.ok ? "verified" : "blocked"} animated>
                    {trailVerdict.ok
                      ? `✓ All ${trailVerdict.length} hashes verified intact`
                      : `Broken at seq #${trailVerdict.brokenAtSeq}`}
                  </Badge>
                )}
              </div>

              {/* Trail Timeline: nodes on a vertical rule */}
              {trailLoading ? (
                <div className="py-8 text-center text-xs font-mono text-[var(--color-ink-soft)]">
                  Verifying cryptographic chain…
                </div>
              ) : trailEntries.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--color-ink-soft)]">
                  No trail entries found for this update.
                </div>
              ) : (
                <div
                  className={`relative ml-4 pl-6 border-l-2 transition-colors duration-500 space-y-6 ${
                    trailVerifiedAnimation || (trailVerdict && trailVerdict.ok)
                      ? "border-[var(--color-verified)]"
                      : "border-[var(--color-rule)]"
                  }`}
                >
                  {trailEntries.map((entry, idx) => {
                    const isVerified = trailVerifiedAnimation || (trailVerdict && trailVerdict.ok);
                    return (
                      <div key={entry.seq} className="relative group">
                        {/* Circle node on vertical rule */}
                        <div
                          className={`absolute -left-[35px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border bg-[var(--color-paper)] text-[10px] font-mono font-bold transition-all ${
                            isVerified
                              ? "border-[var(--color-verified)] text-[var(--color-verified)] animate-check-pop"
                              : "border-[var(--color-rule)] text-[var(--color-ink-soft)]"
                          }`}
                          style={{ animationDelay: `${idx * 70}ms` }}
                        >
                          {isVerified ? "✓" : `#${entry.seq}`}
                        </div>

                        {/* Node details */}
                        <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/40 p-3.5 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Badge tone="neutral">{entry.actor}</Badge>
                              <span className="font-semibold text-[var(--color-ink)] uppercase font-mono tracking-wider text-[11px]">
                                {entry.type}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                              {new Date(entry.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-[var(--color-ink-faint)]">hash:</span>
                              <span className="font-medium text-[var(--color-ink)] break-all select-all">
                                {entry.hash}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-ink-faint)]">
                              <span>prev:</span>
                              <span className="break-all select-all">{entry.prevHash}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--color-rule)] pt-4 mt-8 flex justify-end">
              <button
                type="button"
                onClick={closeDrawer}
                className="min-h-11 inline-flex items-center justify-center rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)] active-press transition"
              >
                Close timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
