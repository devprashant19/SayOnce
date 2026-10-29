"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/Badge";

interface CaseItem {
  id: string;
  group: string;
  spokenText: string;
  expectedRecipients: string[];
  mustKnow?: Record<string, string[]>;
  blocked?: Record<string, string[]>;
  notes?: string;
}

interface CaseResult {
  id: string;
  group: string;
  pass: boolean;
  scores: {
    inventedFacts: number;
    privacy: number;
    mustKnow: number;
    routingRecall: number;
    routingPrecision: number;
    languageScript: number;
    channelFit: number;
  };
  detail: string[];
  trailOk: boolean;
  error?: string;
}

interface RunRecord {
  filename?: string;
  at: string;
  model: string;
  graderTemperature: number;
  caseCount: number;
  passedCount?: number;
  allPassed?: boolean;
  aggregates?: {
    inventedFacts: number;
    privacy: number;
    mustKnow: number;
    routingRecall: number;
    routingPrecision: number;
    languageScript: number;
    channelFit: number;
  };
  results: CaseResult[];
}

const GROUPS = [
  { id: "all", label: "All Groups" },
  { id: "real", label: "Real Updates" },
  { id: "hinglish-edge", label: "Hinglish Edge" },
  { id: "tricky-instruction", label: "Tricky Instruction" },
  { id: "global", label: "Global" },
  { id: "adversarial", label: "Adversarial" },
];

export default function LabPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<RunRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState("gemini-3.1-flash-lite");

  useEffect(() => {
    async function loadLabData() {
      try {
        const res = await fetch("/api/lab");
        if (res.ok) {
          const data = await res.json();
          setCases(data.cases ?? []);
          setHistory(data.history ?? []);
          setModel(data.model ?? "gemini-3.1-flash-lite");
          if (data.history && data.history.length > 0) {
            setCurrentRun(data.history[0]);
          }
        }
      } catch (err) {
        console.warn("Could not load lab data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLabData();
  }, []);

  async function triggerRun(group?: string, caseId?: string) {
    setRunning(true);
    try {
      const res = await fetch("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          group: group === "all" ? undefined : group,
          caseId,
        }),
      });

      if (res.ok) {
        const data: RunRecord = await res.json();
        setCurrentRun(data);
        setHistory((prev) => [data, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      console.error("Run error:", err);
    } finally {
      setRunning(false);
    }
  }

  const filteredCases = cases.filter((c) =>
    selectedGroup === "all" ? true : c.group === selectedGroup,
  );

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-ink-soft)]">
        Loading test suite…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-block rounded bg-[var(--color-accent-wash)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
          Quality Lab · Phase 4
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Accuracy & Quality Lab</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Continuous regression testing against the golden dataset through the live pipeline.
          Model: <span className="font-mono font-medium text-[var(--color-ink)]">{model}</span> ·
          Grader Temp: <span className="font-mono font-medium text-[var(--color-ink)]">0</span>
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGroup(g.id)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedGroup === g.id
                  ? "bg-[var(--color-ink)] text-white"
                  : "border border-[var(--color-rule)] hover:bg-[var(--color-paper-sunk)]"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={running}
            onClick={() => triggerRun(selectedGroup)}
            className="min-h-10 rounded bg-[var(--color-accent)] px-4 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {running
              ? "Running Quality Suite…"
              : `Run ${selectedGroup === "all" ? "All" : selectedGroup} Cases (${filteredCases.length}) →`}
          </button>
        </div>
      </div>

      {/* Scorecard from Latest Run */}
      {currentRun && currentRun.aggregates && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Run Metrics Summary</h2>
            <span className="text-xs text-[var(--color-ink-soft)]">
              {new Date(currentRun.at).toLocaleString()} · {currentRun.caseCount} case(s) evaluated
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            {/* Invented Facts */}
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 space-y-1">
              <span className="text-[var(--color-ink-soft)] font-medium">Invented Facts</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono">
                  {currentRun.aggregates.inventedFacts}
                </span>
                <span className="text-[10px] text-[var(--color-ink-faint)]">(Target: 0)</span>
              </div>
              <Badge tone={currentRun.aggregates.inventedFacts === 0 ? "verified" : "blocked"}>
                {currentRun.aggregates.inventedFacts === 0 ? "0 Invented" : "VIOLATION"}
              </Badge>
            </div>

            {/* Privacy */}
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 space-y-1">
              <span className="text-[var(--color-ink-soft)] font-medium">Privacy Held</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono">
                  {(currentRun.aggregates.privacy * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-[var(--color-ink-faint)]">(Target: 100%)</span>
              </div>
              <Badge tone={currentRun.aggregates.privacy === 1 ? "verified" : "blocked"}>
                {currentRun.aggregates.privacy === 1 ? "100% Held" : "LEAK"}
              </Badge>
            </div>

            {/* Must-Know Coverage */}
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 space-y-1">
              <span className="text-[var(--color-ink-soft)] font-medium">Must-Know</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono">
                  {(currentRun.aggregates.mustKnow * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-[var(--color-ink-faint)]">(Target: 95%)</span>
              </div>
              <Badge tone={currentRun.aggregates.mustKnow >= 0.95 ? "verified" : "neutral"}>
                {currentRun.aggregates.mustKnow >= 0.95 ? "Target met" : "In progress"}
              </Badge>
            </div>

            {/* Routing Recall */}
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 space-y-1">
              <span className="text-[var(--color-ink-soft)] font-medium">Routing Recall</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono">
                  {(currentRun.aggregates.routingRecall * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-[var(--color-ink-faint)]">(Target: 90%)</span>
              </div>
              <Badge tone={currentRun.aggregates.routingRecall >= 0.9 ? "verified" : "neutral"}>
                {currentRun.aggregates.routingRecall >= 0.9 ? "Target met" : "In progress"}
              </Badge>
            </div>

            {/* Routing Precision */}
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 space-y-1">
              <span className="text-[var(--color-ink-soft)] font-medium">Precision</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono">
                  {(currentRun.aggregates.routingPrecision * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-[var(--color-ink-faint)]">(Target: 85%)</span>
              </div>
              <Badge tone={currentRun.aggregates.routingPrecision >= 0.85 ? "verified" : "neutral"}>
                {currentRun.aggregates.routingPrecision >= 0.85 ? "Target met" : "In progress"}
              </Badge>
            </div>

            {/* Language & Script */}
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 space-y-1">
              <span className="text-[var(--color-ink-soft)] font-medium">Script Fit</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono">
                  {(currentRun.aggregates.languageScript * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-[var(--color-ink-faint)]">(Target: 100%)</span>
              </div>
              <Badge tone={currentRun.aggregates.languageScript === 1 ? "verified" : "neutral"}>
                {currentRun.aggregates.languageScript === 1 ? "100% Correct" : "Issues"}
              </Badge>
            </div>

            {/* Channel Fit */}
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 space-y-1">
              <span className="text-[var(--color-ink-soft)] font-medium">Channel Fit</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono">
                  {(currentRun.aggregates.channelFit * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-[var(--color-ink-faint)]">(Target: 95%)</span>
              </div>
              <Badge tone={currentRun.aggregates.channelFit >= 0.95 ? "verified" : "neutral"}>
                {currentRun.aggregates.channelFit >= 0.95 ? "Target met" : "Issues"}
              </Badge>
            </div>
          </div>
        </section>
      )}

      {/* Case Details Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Golden Cases ({filteredCases.length})</h2>

        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-rule)] bg-[var(--color-paper-sunk)] text-[var(--color-ink-soft)]">
              <tr>
                <th className="p-3 font-semibold">Case ID</th>
                <th className="p-3 font-semibold">Group</th>
                <th className="p-3 font-semibold">Spoken Input</th>
                <th className="p-3 font-semibold">Recipients</th>
                <th className="p-3 font-semibold">Latest Verdict</th>
                <th className="p-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)]">
              {filteredCases.map((c) => {
                const caseResult = currentRun?.results.find((r) => r.id === c.id);
                const isSelected = selectedCaseId === c.id;

                return (
                  <tr key={c.id} className="hover:bg-[var(--color-paper-sunk)]/50">
                    <td className="p-3 font-mono font-bold text-[var(--color-ink)]">{c.id}</td>
                    <td className="p-3">
                      <span className="rounded bg-[var(--color-paper-sunk)] px-2 py-0.5 font-medium">
                        {c.group}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate" title={c.spokenText}>
                      {c.spokenText}
                    </td>
                    <td className="p-3 text-[var(--color-ink-soft)]">
                      {c.expectedRecipients.join(", ")}
                    </td>
                    <td className="p-3">
                      {caseResult ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-semibold text-[11px] ${
                            caseResult.pass
                              ? "bg-[var(--color-verified-wash)] text-[var(--color-verified)]"
                              : "bg-[var(--color-blocked-wash)] text-[var(--color-blocked)]"
                          }`}
                        >
                          {caseResult.pass ? "PASS" : "FAIL"}
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-faint)]">Not tested</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCaseId(isSelected ? null : c.id)}
                          className="rounded border border-[var(--color-rule)] px-2 py-1 hover:bg-[var(--color-paper-sunk)]"
                        >
                          {isSelected ? "Hide" : "Inspect"}
                        </button>
                        <button
                          type="button"
                          disabled={running}
                          onClick={() => triggerRun(undefined, c.id)}
                          className="rounded bg-[var(--color-ink)] text-white px-2 py-1 font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          Run
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Case Inspector Dialog */}
      {selectedCaseId && (
        <section className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-4 space-y-3">
          {(() => {
            const c = cases.find((x) => x.id === selectedCaseId);
            const r = currentRun?.results.find((x) => x.id === selectedCaseId);
            if (!c) return null;

            return (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2">
                  <h3 className="font-semibold text-sm">Case Inspector: {c.id}</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCaseId(null)}
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  >
                    Close ✕
                  </button>
                </div>

                <div>
                  <span className="font-medium text-[var(--color-ink)]">Spoken Input:</span>
                  <p className="mt-1 rounded bg-[var(--color-paper)] p-2.5 font-sans leading-relaxed border border-[var(--color-rule)]">
                    {c.spokenText}
                  </p>
                </div>

                {c.notes && (
                  <p className="text-[var(--color-ink-soft)] italic">
                    Notes: {c.notes}
                  </p>
                )}

                {r?.detail && r.detail.length > 0 && (
                  <div>
                    <span className="font-medium text-[var(--color-blocked)]">Details & Failures:</span>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--color-ink)]">
                      {r.detail.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
        </section>
      )}

      {/* Run History */}
      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Run History ({history.length})</h2>
          <div className="space-y-1.5 text-xs">
            {history.map((h, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between rounded border border-[var(--color-rule)] bg-[var(--color-paper)] p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[var(--color-ink-soft)]">
                    {new Date(h.at).toLocaleDateString()} {new Date(h.at).toLocaleTimeString()}
                  </span>
                  <span className="font-semibold">{h.model}</span>
                  <span className="text-[var(--color-ink-soft)]">({h.caseCount} cases)</span>
                </div>
                {h.aggregates && (
                  <div className="flex items-center gap-3">
                    <span>
                      Invented: <strong>{h.aggregates.inventedFacts}</strong>
                    </span>
                    <span>
                      Privacy: <strong>{(h.aggregates.privacy * 100).toFixed(0)}%</strong>
                    </span>
                    <span>
                      Must-Know: <strong>{(h.aggregates.mustKnow * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
