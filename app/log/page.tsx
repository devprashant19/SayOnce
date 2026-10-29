"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { TrustTrailViewer } from "@/components/TrustTrailViewer";
import type { UpdateLogRow } from "@/lib/update-repo";
import type { TrailEntry } from "@/lib/trail";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewTrailUpdateId, setViewTrailUpdateId] = useState<string | null>(null);
  const [trailEntries, setTrailEntries] = useState<TrailEntry[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);

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

  async function handleOpenTrail(updateId: string) {
    setViewTrailUpdateId(updateId);
    setTrailLoading(true);
    try {
      const res = await fetch("/api/trail/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updateId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrailEntries(data.entries ?? []);
      }
    } catch (err) {
      console.warn("Failed to fetch trail:", err);
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
      <div>
        <div className="inline-block rounded bg-[var(--color-accent-wash)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
          Update Log · Phase 5
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">The Record Nobody Used to Keep</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Every update you speak automatically logs its summary, decisions, recipients, sent status, and cryptographic audit trail.
        </p>
      </div>

      {/* Voice Return Stats */}
      {metrics && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-1">
            <span className="text-xs text-[var(--color-ink-soft)]">Total Updates</span>
            <p className="text-xl font-bold tracking-tight">{metrics.totalUpdates}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-1">
            <span className="text-xs text-[var(--color-ink-soft)]">Words Amplification</span>
            <p className="text-xl font-bold tracking-tight text-[var(--color-accent)]">
              {metrics.amplification}x
            </p>
            <span className="block text-[11px] text-[var(--color-ink-soft)]">
              {metrics.totalSpokenWords} spoken → {metrics.totalDeliveredWords} delivered
            </span>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-1">
            <span className="text-xs text-[var(--color-ink-soft)]">Time Saved</span>
            <p className="text-xl font-bold tracking-tight text-[var(--color-verified)]">
              ~{metrics.totalMinutesSaved} min
            </p>
            <span className="block text-[11px] text-[var(--color-ink-soft)]">
              vs manual update drafting
            </span>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-1">
            <span className="text-xs text-[var(--color-ink-soft)]">Open Commitments</span>
            <p className="text-xl font-bold tracking-tight">
              {allCommitments.filter((c) => c.status === "open").length}
            </p>
            <span className="block text-[11px] text-[var(--color-ink-soft)]">
              Tracked across projects
            </span>
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[var(--color-rule)] text-sm">
        <button
          type="button"
          onClick={() => setTab("updates")}
          className={`min-h-11 inline-flex items-center pb-2.5 font-medium transition-colors border-b-2 -mb-px ${
            tab === "updates"
              ? "border-[var(--color-ink)] text-[var(--color-ink)]"
              : "border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          }`}
        >
          Updates Log ({filteredUpdates.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("commitments")}
          className={`min-h-11 inline-flex items-center pb-2.5 font-medium transition-colors border-b-2 -mb-px ${
            tab === "commitments"
              ? "border-[var(--color-ink)] text-[var(--color-ink)]"
              : "border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          }`}
        >
          Open Commitments ({allCommitments.filter((c) => c.status === "open").length})
        </button>
      </div>

      {tab === "updates" && (
        <section className="space-y-4">
          {/* Controls: Search, Filter, Export */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 text-xs">
            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[260px]">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search raw text, summary, decisions…"
                className="min-h-11 flex-1 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)]"
              />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 text-xs text-[var(--color-ink)]"
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
                className="min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 text-xs text-[var(--color-ink)]"
              >
                <option value="all">All Recipients</option>
                {contacts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredUpdates.length === 0}
              className="min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper)] disabled:opacity-50"
            >
              Export CSV ↓
            </button>
          </div>

          {/* Dense Scannable Log Table */}
          {loading ? (
            <div className="py-12 text-center text-sm text-[var(--color-ink-soft)]">
              Loading records…
            </div>
          ) : filteredUpdates.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-8 text-center text-xs text-[var(--color-ink-soft)]">
              No updates match the selected filters.
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label="Update log table, scrolls horizontally"
              className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-sm"
            >
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--color-rule)] bg-[var(--color-paper-sunk)] font-semibold text-[var(--color-ink)]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Summary & Decisions</th>
                    <th className="py-2.5 px-3">Recipients & Sent</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)] font-sans">
                  {filteredUpdates.map((u) => {
                    const isExpanded = expandedId === u.id;
                    const sentCount = u.messages.filter((m) => m.sent).length;
                    const totalMsg = u.messages.length;

                    return (
                      <tr key={u.id} className="hover:bg-[var(--color-paper-sunk)]/50 transition-colors">
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <span className="font-mono font-medium text-[var(--color-ink)]">
                            {u.spokenOn}
                          </span>
                          <span className="block text-[11px] text-[var(--color-ink-soft)]">
                            {new Date(u.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <span className="inline-block rounded bg-[var(--color-paper-sunk)] px-2 py-0.5 font-medium text-[var(--color-ink)] border border-[var(--color-rule)]">
                            {u.project || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top space-y-1">
                          <p className="font-medium text-[var(--color-ink)] leading-snug">
                            {u.summary || u.rawText.slice(0, 80) + "…"}
                          </p>
                          {u.decisions.length > 0 && (
                            <ul className="list-disc pl-4 text-[11px] text-[var(--color-ink-soft)] space-y-0.5">
                              {u.decisions.map((d, idx) => (
                                <li key={idx}>{d}</li>
                              ))}
                            </ul>
                          )}
                          {isExpanded && (
                            <div className="mt-2.5 pt-2 border-t border-[var(--color-rule)] space-y-2">
                              <div>
                                <span className="font-semibold text-[var(--color-ink)]">Raw spoken text:</span>
                                <p className="italic text-[var(--color-ink-soft)] font-serif mt-0.5">
                                  &quot;{u.rawText}&quot;
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold text-[var(--color-ink)]">Drafted messages:</span>
                                <div className="space-y-1.5">
                                  {u.messages.map((m) => (
                                    <div key={m.id} className="rounded bg-[var(--color-paper-sunk)] p-2 text-[11px]">
                                      <div className="flex items-center justify-between font-semibold">
                                        <span>Recipient: {m.contactId} ({m.channel})</span>
                                        <span>{m.sent ? "✓ Sent" : "Drafted"}</span>
                                      </div>
                                      <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge tone={sentCount === totalMsg && totalMsg > 0 ? "verified" : "locked"}>
                              {sentCount}/{totalMsg} sent
                            </Badge>
                          </div>
                          <span className="block text-[11px] text-[var(--color-ink-soft)] truncate max-w-[150px]">
                            {u.messages.map((m) => m.contactId).join(", ")}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : u.id)}
                            className="min-h-11 inline-flex items-center rounded px-2 text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                          >
                            {isExpanded ? "Less ▲" : "Details ▼"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenTrail(u.id)}
                            className="min-h-11 inline-flex items-center rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-2.5 text-xs font-medium hover:bg-[var(--color-paper)]"
                          >
                            Trust trail ⛓️
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
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--color-rule)] bg-[var(--color-paper-sunk)] font-semibold text-[var(--color-ink)]">
                  <tr>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3">Commitment / Promise</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)] font-sans">
                  {allCommitments.map((c) => (
                    <tr key={c.factId} className="hover:bg-[var(--color-paper-sunk)]/50">
                      <td className="py-3 px-3 align-top font-semibold text-[var(--color-ink)]">
                        {c.owner}
                      </td>
                      <td className="py-3 px-3 align-top font-medium text-[var(--color-ink)]">
                        &quot;{c.text}&quot;
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap font-mono text-[var(--color-ink)]">
                        {c.due ?? "Unscheduled"}
                      </td>
                      <td className="py-3 px-3 align-top text-[var(--color-ink-soft)]">
                        {c.project || "General"}
                      </td>
                      <td className="py-3 px-3 align-top">
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

      {/* Trust Trail Modal / Viewer */}
      {viewTrailUpdateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] bg-[var(--color-paper)] p-5 shadow-2xl space-y-4 border border-[var(--color-rule)]">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <h2 className="text-base font-semibold">Trust Trail for Update</h2>
              <button
                type="button"
                onClick={() => setViewTrailUpdateId(null)}
                className="rounded px-2.5 py-1 text-sm font-semibold hover:bg-[var(--color-paper-sunk)]"
              >
                ✕ Close
              </button>
            </div>

            {trailLoading ? (
              <div className="py-8 text-center text-xs text-[var(--color-ink-soft)]">
                Loading cryptographic trail…
              </div>
            ) : (
              <TrustTrailViewer
                entries={trailEntries}
                updateId={viewTrailUpdateId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
