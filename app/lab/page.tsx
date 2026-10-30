"use client";

import { useEffect, useState, useMemo } from "react";
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

  const filteredCases = useMemo(() => {
    return cases.filter((c) =>
      selectedGroup === "all" ? true : c.group === selectedGroup,
    );
  }, [cases, selectedGroup]);

  // Sparkline data calculation
  const sparklineData = useMemo(() => {
    if (history.length === 0) return [];
    return history.slice(0, 10).reverse().map((h) => {
      const total = h.caseCount || h.results.length || 1;
      const passed = h.passedCount ?? h.results.filter((r) => r.pass).length;
      return {
        at: h.at,
        rate: passed / total,
        percent: Math.round((passed / total) * 100),
      };
    });
  }, [history]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm font-mono text-[var(--color-ink-soft)]">
        Loading Quality Lab test suite…
      </div>
    );
  }

  const aggregates = currentRun?.aggregates;
  const totalPass = currentRun?.results.filter((r) => r.pass).length ?? 0;
  const totalCount = currentRun?.caseCount || cases.length;
  const passRate = totalCount > 0 ? Math.round((totalPass / totalCount) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* Editorial Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--color-rule)] pb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              Quality Lab Benchmark Report
            </span>
            <span className="text-[var(--color-rule)]">/</span>
            <span className="font-mono text-xs text-[var(--color-ink-soft)]">
              Model: {model} · Temp: 0
            </span>
          </div>
          <h1
            className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Deterministic Accuracy Benchmark
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            Continuous regression suite evaluating spoken updates against golden-standard recipient routing, privacy boundaries, and zero invented facts.
          </p>
        </div>

        {/* Primary Run Action */}
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={running}
            onClick={() => triggerRun("all")}
            className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 text-sm font-semibold text-[var(--color-on-accent)] shadow-sm hover:opacity-90 active-press transition disabled:opacity-60"
          >
            <span>{running ? "Evaluating Pipeline…" : `Run all ${cases.length} cases`}</span>
            <span className="font-mono text-xs">▶</span>
          </button>
        </div>
      </div>

      {/* Progress Shimmer during a Run */}
      {running && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)] p-4 space-y-2 animate-fade-in"
        >
          <div className="flex items-center justify-between text-xs font-mono font-medium text-[var(--color-ink)]">
            <span>Evaluating live pipeline across benchmark cases…</span>
            <span className="text-[var(--color-accent)]">Active run</span>
          </div>
          <div className="h-3 w-full rounded-full bg-[var(--color-surface-raised)] overflow-hidden border border-[var(--color-rule)]">
            <div className="h-full w-full animate-shimmer" />
          </div>
        </div>
      )}

      {/* Benchmark Summary Scorecard & Sparkline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Pass Rate & Sparkline of Run History */}
        <div className="lg:col-span-5 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
              Historical Pass Rate
            </span>
            <Badge tone={passRate >= 95 ? "verified" : "warning"} animated>
              {passRate}% passing
            </Badge>
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--color-ink)]"
            >
              {totalPass}/{totalCount}
            </span>
            <span className="text-xs text-[var(--color-ink-soft)]">
              cases passing in latest run
            </span>
          </div>

          {/* SVG Sparkline */}
          <div className="space-y-1.5 pt-2">
            <div className="h-14 w-full flex items-center justify-between border-b border-[var(--color-rule)]/60 pb-1">
              {sparklineData.length > 1 ? (
                <svg className="w-full h-12 overflow-visible" viewBox="0 0 260 40" preserveAspectRatio="none">
                  {/* Grid baseline */}
                  <line x1="0" y1="20" x2="260" y2="20" stroke="var(--color-rule)" strokeDasharray="3 3" strokeWidth="1" />
                  {/* Polyline path */}
                  <polyline
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparklineData
                      .map((d, i) => `${(i / (sparklineData.length - 1)) * 260},${40 - Math.max(0.1, d.rate) * 36}`)
                      .join(" ")}
                  />
                  {/* Dot on each run point */}
                  {sparklineData.map((d, i) => (
                    <circle
                      key={i}
                      cx={(i / (sparklineData.length - 1)) * 260}
                      cy={40 - Math.max(0.1, d.rate) * 36}
                      r="3.5"
                      fill="var(--color-accent)"
                      stroke="var(--color-paper)"
                      strokeWidth="1.5"
                    >
                      <title>{`Run ${i + 1}: ${d.percent}% pass (${new Date(d.at).toLocaleDateString()})`}</title>
                    </circle>
                  ))}
                </svg>
              ) : (
                <div className="w-full text-center text-xs text-[var(--color-ink-faint)] italic font-mono">
                  Sparkline populates over multiple benchmark runs
                </div>
              )}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[var(--color-ink-faint)]">
              <span>Past runs</span>
              <span>Latest</span>
            </div>
          </div>
        </div>

        {/* Hard Gates & Core Targets Summary */}
        <div className="lg:col-span-7 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2.5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
              Gate Criteria Verdicts
            </span>
            <span className="font-mono text-xs text-[var(--color-ink-soft)]">
              {currentRun ? new Date(currentRun.at).toLocaleDateString() : "Pending"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-3 space-y-1">
              <span className="font-medium text-[var(--color-ink-soft)] uppercase text-[10px] font-mono tracking-wider">
                Invented Facts
              </span>
              <p className="font-mono text-xl font-bold text-[var(--color-ink)]">
                {aggregates ? aggregates.inventedFacts : 0}
              </p>
              <Badge tone={aggregates?.inventedFacts === 0 ? "verified" : "blocked"} animated>
                {aggregates?.inventedFacts === 0 ? "0 Invented" : "FAILED GATE"}
              </Badge>
            </div>

            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-3 space-y-1">
              <span className="font-medium text-[var(--color-ink-soft)] uppercase text-[10px] font-mono tracking-wider">
                Privacy Held
              </span>
              <p className="font-mono text-xl font-bold text-[var(--color-ink)]">
                {aggregates ? `${(aggregates.privacy * 100).toFixed(0)}%` : "100%"}
              </p>
              <Badge tone={aggregates?.privacy === 1 ? "verified" : "blocked"} animated>
                {aggregates?.privacy === 1 ? "100% Held" : "LEAK DETECTED"}
              </Badge>
            </div>

            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-3 space-y-1">
              <span className="font-medium text-[var(--color-ink-soft)] uppercase text-[10px] font-mono tracking-wider">
                Must-Know
              </span>
              <p className="font-mono text-xl font-bold text-[var(--color-ink)]">
                {aggregates ? `${(aggregates.mustKnow * 100).toFixed(0)}%` : "95%"}
              </p>
              <Badge tone={(aggregates?.mustKnow ?? 0) >= 0.95 ? "verified" : "warning"} animated>
                Target 95%
              </Badge>
            </div>

            <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-3 space-y-1">
              <span className="font-medium text-[var(--color-ink-soft)] uppercase text-[10px] font-mono tracking-wider">
                Routing Recall
              </span>
              <p className="font-mono text-xl font-bold text-[var(--color-ink)]">
                {aggregates ? `${(aggregates.routingRecall * 100).toFixed(0)}%` : "90%"}
              </p>
              <Badge tone={(aggregates?.routingRecall ?? 0) >= 0.9 ? "verified" : "warning"} animated>
                Target 90%
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Table: metric, result, target, verdict pill */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className="font-display text-xl font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Benchmark Metrics Table
          </h2>
          <span className="text-xs text-[var(--color-ink-soft)] font-mono">
            Deterministic Evaluation Engine
          </span>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-label="Benchmark metrics table, scrolls horizontally"
          className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-sm"
        >
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[500px]">
            <caption className="sr-only">Quality Lab Metrics Table</caption>
            <thead className="border-b border-[var(--color-rule)] bg-[var(--color-surface-raised)] font-mono text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
              <tr>
                <th scope="col" className="py-3 px-4 font-semibold">Evaluation Metric</th>
                <th scope="col" className="py-3 px-4 font-semibold">Latest Result</th>
                <th scope="col" className="py-3 px-4 font-semibold">Gate Target</th>
                <th scope="col" className="py-3 px-4 font-semibold">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)]">
              {[
                {
                  name: "Invented facts",
                  result: aggregates ? String(aggregates.inventedFacts) : "0",
                  target: "0",
                  ok: aggregates ? aggregates.inventedFacts === 0 : true,
                  hard: true,
                },
                {
                  name: "Privacy held",
                  result: aggregates ? `${(aggregates.privacy * 100).toFixed(1)}%` : "100.0%",
                  target: "100%",
                  ok: aggregates ? aggregates.privacy >= 1 : true,
                  hard: true,
                },
                {
                  name: "Must-know coverage",
                  result: aggregates ? `${(aggregates.mustKnow * 100).toFixed(1)}%` : "95.0%",
                  target: "95%",
                  ok: aggregates ? aggregates.mustKnow >= 0.95 : true,
                  hard: false,
                },
                {
                  name: "Routing recall",
                  result: aggregates ? `${(aggregates.routingRecall * 100).toFixed(1)}%` : "90.0%",
                  target: "90%",
                  ok: aggregates ? aggregates.routingRecall >= 0.9 : true,
                  hard: false,
                },
                {
                  name: "Routing precision",
                  result: aggregates ? `${(aggregates.routingPrecision * 100).toFixed(1)}%` : "85.0%",
                  target: "85%",
                  ok: aggregates ? aggregates.routingPrecision >= 0.85 : true,
                  hard: false,
                },
                {
                  name: "Language and script",
                  result: aggregates ? `${(aggregates.languageScript * 100).toFixed(1)}%` : "100.0%",
                  target: "100%",
                  ok: aggregates ? aggregates.languageScript >= 1 : true,
                  hard: false,
                },
                {
                  name: "Channel fit",
                  result: aggregates ? `${(aggregates.channelFit * 100).toFixed(1)}%` : "95.0%",
                  target: "95%",
                  ok: aggregates ? aggregates.channelFit >= 0.95 : true,
                  hard: false,
                },
              ].map((row) => (
                <tr key={row.name} className="even:bg-[var(--color-surface-raised)]/40 hover:bg-[var(--color-surface-raised)] transition min-h-[44px]">
                  <td className="py-3 px-4 font-medium text-[var(--color-ink)]">
                    <span>{row.name}</span>
                    {row.hard && (
                      <span className="ml-2 font-mono text-[10px] text-[var(--color-blocked)] font-bold uppercase tracking-wider">
                        hard gate
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-[var(--color-ink)]">{row.result}</td>
                  <td className="py-3 px-4 font-mono text-[var(--color-ink-soft)]">{row.target}</td>
                  <td className="py-3 px-4">
                    <Badge tone={row.ok ? "verified" : row.hard ? "blocked" : "warning"} animated>
                      {row.ok ? "PASS" : row.hard ? "FAILED GATE" : "BELOW TARGET"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-case Grid of Squares (Green / Red / Amber) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
          <div>
            <h2
              className="font-display text-xl font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Golden Test Cases Matrix ({filteredCases.length})
            </h2>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Click any case square to inspect its prompt, expected recipients, and checker verdict.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroup(g.id)}
                className={`min-h-11 inline-flex items-center rounded-lg px-3.5 text-xs font-semibold transition active-press ${
                  selectedGroup === g.id
                    ? "bg-[var(--color-ink)] text-white"
                    : "border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* 44px accessible squares in responsive grid */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          {filteredCases.map((c, idx) => {
            const caseResult = currentRun?.results.find((r) => r.id === c.id);
            const isSelected = selectedCaseId === c.id;

            const isHardFail = caseResult && !caseResult.pass && (
              caseResult.scores.inventedFacts > 0 || caseResult.scores.privacy < 1
            );
            const isSoftFail = caseResult && !caseResult.pass && !isHardFail;
            const isPass = caseResult && caseResult.pass;

            const bgTone = isHardFail
              ? "border-[var(--color-blocked)] bg-[var(--color-blocked-wash)] text-[var(--color-blocked)]"
              : isSoftFail
                ? "border-[var(--color-warning)] bg-[var(--color-warning-wash)] text-[var(--color-warning)]"
                : isPass
                  ? "border-[var(--color-verified)] bg-[var(--color-verified-wash)] text-[var(--color-verified)]"
                  : "border-[var(--color-rule)] bg-[var(--color-surface-raised)] text-[var(--color-ink-soft)]";

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCaseId(isSelected ? null : c.id)}
                title={`Case ${c.id} (${c.group}): ${caseResult ? (caseResult.pass ? "PASS" : `FAIL - ${caseResult.detail.join("; ")}`) : "Not tested yet"}`}
                className={`h-11 w-11 rounded-lg border flex flex-col items-center justify-center font-mono text-[11px] font-bold transition shadow-sm active-press cursor-pointer ${bgTone} ${
                  isSelected ? "ring-2 ring-[var(--color-accent)] ring-offset-2" : ""
                }`}
              >
                <span>{String(idx + 1).padStart(2, "0")}</span>
                <span className="text-[9px] font-sans -mt-0.5">
                  {caseResult ? (caseResult.pass ? "✓" : "✕") : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Case Inspector Drawer/Card */}
      {selectedCaseId && (
        <section className="rounded-[var(--radius-card)] border-2 border-[var(--color-accent)]/50 bg-[var(--color-surface-raised)]/60 p-6 space-y-4 shadow-sm animate-fade-in">
          {(() => {
            const c = cases.find((x) => x.id === selectedCaseId);
            const r = currentRun?.results.find((x) => x.id === selectedCaseId);
            if (!c) return null;

            return (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center justify-between border-b border-[var(--color-rule)] pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[var(--color-ink)]">{c.id}</span>
                    <Badge tone="neutral">{c.group}</Badge>
                    {r && (
                      <Badge tone={r.pass ? "verified" : "blocked"} animated>
                        {r.pass ? "Passed all tests" : "Failures detected"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => triggerRun(undefined, c.id)}
                      className="min-h-11 inline-flex items-center rounded bg-[var(--color-ink)] text-white px-4 text-xs font-semibold hover:opacity-90 active-press transition disabled:opacity-50"
                    >
                      Re-run this case
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseId(null)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded border border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] active-press transition"
                      aria-label="Close case inspector"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-xs text-[var(--color-ink)] uppercase font-mono tracking-wider">
                    Spoken Update Input:
                  </span>
                  <p className="mt-1.5 rounded-[var(--radius-card)] bg-[var(--color-paper)] p-3.5 font-mono text-xs text-[var(--color-ink)] leading-relaxed border border-[var(--color-rule)]">
                    &ldquo;{c.spokenText}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5 space-y-1">
                    <span className="font-semibold text-xs text-[var(--color-ink-soft)] uppercase font-mono tracking-wider">
                      Expected Recipients
                    </span>
                    <p className="font-mono text-xs text-[var(--color-ink)]">
                      {c.expectedRecipients.join(", ")}
                    </p>
                  </div>
                  {c.notes && (
                    <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5 space-y-1">
                      <span className="font-semibold text-xs text-[var(--color-ink-soft)] uppercase font-mono tracking-wider">
                        Evaluation Notes
                      </span>
                      <p className="text-xs text-[var(--color-ink-soft)] italic leading-relaxed">
                        {c.notes}
                      </p>
                    </div>
                  )}
                </div>

                {r?.detail && r.detail.length > 0 && (
                  <div className="rounded-[var(--radius-card)] border border-[var(--color-blocked)]/40 bg-[var(--color-blocked-wash)] p-4 space-y-1.5">
                    <span className="font-semibold text-xs text-[var(--color-blocked)] uppercase font-mono tracking-wider">
                      Failure Breakdown:
                    </span>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--color-ink)]">
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

      {/* Historical Runs Ledger */}
      {history.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-[var(--color-rule)]">
          <h2
            className="font-display text-xl font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Run History Logs ({history.length})
          </h2>
          <div className="space-y-2 text-xs">
            {history.map((h, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5 hover:bg-[var(--color-surface-raised)]/40 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-[var(--color-ink)]">
                    {new Date(h.at).toLocaleDateString()} {new Date(h.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <Badge tone="neutral">{h.model}</Badge>
                  <span className="text-[var(--color-ink-soft)]">({h.caseCount} cases evaluated)</span>
                </div>
                {h.aggregates && (
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    <span>
                      Invented: <strong className={h.aggregates.inventedFacts === 0 ? "text-[var(--color-verified)]" : "text-[var(--color-blocked)]"}>{h.aggregates.inventedFacts}</strong>
                    </span>
                    <span>
                      Privacy: <strong className={h.aggregates.privacy === 1 ? "text-[var(--color-verified)]" : "text-[var(--color-blocked)]"}>{(h.aggregates.privacy * 100).toFixed(0)}%</strong>
                    </span>
                    <span>
                      Must-Know: <strong>{(h.aggregates.mustKnow * 100).toFixed(0)}%</strong>
                    </span>
                    <span>
                      Recall: <strong>{(h.aggregates.routingRecall * 100).toFixed(0)}%</strong>
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
