"use client";

import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { Badge } from "@/components/Badge";
import { CounterCard } from "@/components/parity/CounterCard";
import { Gauge } from "@/components/parity/Gauge";
import { labMetricRows, labPassRate, type MetricRow, type Verdict } from "@/lib/lab-verdicts";

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

const TONE: Record<Verdict, "verified" | "review" | "blocked" | "neutral"> = {
  pass: "verified",
  below: "review",
  failed: "blocked",
  "not-run": "neutral",
};
const BADGE: Record<Verdict, "verified" | "warning" | "blocked" | "neutral"> = {
  pass: "verified",
  below: "warning",
  failed: "blocked",
  "not-run": "neutral",
};
const LABEL: Record<Verdict, string> = {
  pass: "Pass",
  below: "Below target",
  failed: "Failed gate",
  "not-run": "Not run",
};
const VERDICT_TEXT: Record<Verdict, string> = {
  pass: "PASS",
  below: "BELOW TARGET",
  failed: "FAILED GATE",
  "not-run": "NOT RUN",
};
const ICON: Record<Verdict, React.ReactNode> = {
  pass: <CheckCircle2 size={12} strokeWidth={2.5} />,
  below: <HelpCircle size={12} strokeWidth={2.5} />,
  failed: <AlertTriangle size={12} strokeWidth={2.5} />,
  "not-run": <Clock size={12} strokeWidth={2.5} />,
};

export default function LabPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<RunRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState("gemini-3.1-flash-lite");
  // The server says whether this deployment may run the lab. On a shared
  // host a full run is ~240 model calls against the same free quota every
  // visitor's live fan-out uses, so it runs locally instead.
  const [canRun, setCanRun] = useState(false);

  useEffect(() => {
    async function loadLabData() {
      try {
        const res = await fetch("/api/lab");
        if (res.ok) {
          const data = await res.json();
          setCases(data.cases ?? []);
          setHistory(data.history ?? []);
          setModel(data.model ?? "gemini-3.1-flash-lite");
          setCanRun(data.canRun === true);
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


  if (loading) {
    return (
      <div className="py-16 text-center text-sm font-mono text-[var(--color-ink-soft)]">
        Loading Quality Lab test suite…
      </div>
    );
  }

  // A benchmark that has not run has no result: see lib/lab-verdicts.
  const rows = labMetricRows(currentRun?.aggregates);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r])) as Record<MetricRow["key"], MetricRow>;
  const passRate = labPassRate(currentRun);

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
            disabled={running || !canRun}
            onClick={() => triggerRun("all")}
            className="btn-pill btn-accent text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{running ? "Evaluating pipeline…" : `Run all ${cases.length} cases`}</span>
            <span className="btn-chip font-mono text-xs" aria-hidden="true">▶</span>
          </button>
          {!canRun && (
            <p className="max-w-[16rem] text-[11px] text-[var(--color-ink-soft)]">
              Runs on a developer machine with <code className="font-mono">npm run lab</code>.
              A full run is about 240 model calls.
            </p>
          )}
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

      {/* Parity's results row. A benchmark that has not run has no result. */}
      <section aria-labelledby="lab-summary" className="space-y-4">
        <h2 id="lab-summary" className="sr-only">
          Latest run summary
        </h2>
        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${
                currentRun ? "animate-pulse bg-[var(--color-brand)]" : "bg-[var(--color-ink-faint)]"
              }`}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)]">
              {currentRun
                ? `Latest run · ${new Date(currentRun.at).toLocaleDateString()}`
                : "No run on record yet"}
            </span>
            <span className="hidden text-xs text-[var(--color-ink-soft)] md:inline">
              {currentRun
                ? // Older run records lack these fields; say only what was recorded.
                  `(${[
                    currentRun.model,
                    typeof currentRun.graderTemperature === "number"
                      ? `grader temperature ${currentRun.graderTemperature}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "run details not recorded"})`
                : "(nothing below is a result until the golden set has run)"}
            </span>
          </div>
          <span className="shrink-0 text-xs font-medium text-[var(--color-accent)]">
            {passRate ? `${passRate.total} golden cases evaluated` : `${cases.length} golden cases ready`}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div className="hover-card-lift animate-fade-in flex flex-col justify-between rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm sm:col-span-2 sm:p-5 lg:col-span-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-[var(--color-accent)]">Pass rate</span>
              <span className="text-[var(--color-ink-soft)]">Golden set</span>
            </div>
            {passRate ? (
              <div className="mt-1">
                <Gauge
                  value={passRate.percent}
                  label="Golden cases passing"
                  color={passRate.percent >= 95 ? "var(--color-verified)" : "var(--color-brand)"}
                />
              </div>
            ) : (
              <div className="my-6 flex flex-col items-center gap-2 text-center text-[var(--color-ink-soft)]">
                <Clock size={22} aria-hidden="true" />
                <span className="text-sm font-medium text-[var(--color-ink)]">Not yet run</span>
              </div>
            )}
            <p className="mt-1 text-center text-[11px] font-medium text-[var(--color-ink-soft)]">
              {passRate ? `${passRate.passed} of ${passRate.total} cases passed` : "No benchmark recorded"}
            </p>
          </div>
          {(["inventedFacts", "privacy", "mustKnow"] as const).map((key, i) => {
            const row = byKey[key];
            return (
              <CounterCard
                key={key}
                tone={TONE[row.verdict]}
                label={row.name}
                meta={row.hard ? "Hard gate" : "Target"}
                value={row.result}
                pill={{ icon: ICON[row.verdict], text: LABEL[row.verdict], tone: TONE[row.verdict] }}
                footer={`Target ${row.target}`}
                delayMs={(i + 1) * 60}
              />
            );
          })}
        </div>
      </section>

      {/* Metrics table: one row per metric, judged by lib/lab-verdicts. */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--color-ink)]">
            Benchmark metrics
          </h2>
          <span className="font-mono text-xs text-[var(--color-ink-soft)]">Deterministic grader</span>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-label="Benchmark metrics table, scrolls horizontally"
          className="overflow-x-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm"
        >
          <table className="w-full min-w-[500px] border-collapse text-left text-xs sm:text-sm">
            <caption className="sr-only">Quality Lab metrics table</caption>
            <thead className="border-b border-[var(--color-line)] bg-[var(--color-surface-raised)] font-mono text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Metric</th>
                <th scope="col" className="px-4 py-3 font-semibold">Latest result</th>
                <th scope="col" className="px-4 py-3 font-semibold">Target</th>
                <th scope="col" className="px-4 py-3 font-semibold">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {rows.map((row) => (
                <tr key={row.key} className="transition hover:bg-[var(--color-surface-raised)]">
                  <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                    <span>{row.name}</span>
                    {row.hard && (
                      <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-blocked)]">
                        hard gate
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      row.value === null
                        ? "text-[var(--color-ink-soft)]"
                        : "font-mono font-medium text-[var(--color-ink)]"
                    }`}
                  >
                    {row.result}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-ink-soft)]">{row.target}</td>
                  <td className="px-4 py-3">
                    <Badge tone={BADGE[row.verdict]} animated>
                      {VERDICT_TEXT[row.verdict]}
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
                      disabled={running || !canRun}
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
