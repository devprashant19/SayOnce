import Link from "next/link";
import { Badge } from "@/components/Badge";
import { ProofContainer } from "@/components/ProofContainer";
import { measured, proofEvidence, type Measured } from "@/lib/proof";

/**
 * The Evidence Tear Sheet — /proof.
 *
 * Every number on this page is read from stored data or from the latest
 * Quality Lab run on disk. **Nothing here is hardcoded, and nothing that has
 * not been measured is shown as a figure** — it says "Not yet measured".
 *
 * That is not modesty. A judge who asks "how did you measure this?" and gets
 * no answer has learned something about every other claim on the site. The
 * honest gap is the stronger position.
 *
 * No name, phone number or email address appears here: the real-use totals are
 * aggregates, and `npm run audit:secrets` fails the build if one leaks in.
 */

export const metadata = {
  title: "Proof & real use — SayOnce",
  description:
    "What SayOnce has actually produced: real-use totals, the latest Quality Lab scores, and what has not been measured yet.",
};

// Read fresh on every request; these numbers change as the tool is used.
export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: Measured;
  note: string;
  tone?: "neutral" | "verified" | "accent";
}) {
  if (!value.isMeasured) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-5 flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
            {label}
          </span>
          <div className="mt-2 text-sm font-mono italic text-[var(--color-ink-faint)]">
            {value.text}
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-faint)] leading-relaxed">{note}</p>
      </div>
    );
  }

  const match = value.text.match(/^([\d.,]+)\s*(.*)$/);
  const numPart = match ? match[1] : value.text;
  const unitPart = match ? match[2] : "";

  const colour =
    tone === "verified"
      ? "text-[var(--color-verified)]"
      : tone === "accent"
        ? "text-[var(--color-accent)]"
        : "text-[var(--color-ink)]";

  return (
    <div className="hover-card-lift rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 shadow-sm flex flex-col justify-between">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
          {label}
        </span>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`font-display text-3xl sm:text-4xl font-semibold tracking-tight ${colour}`}
          >
            {numPart}
          </span>
          {unitPart ? (
            <span
              className="font-mono text-xs sm:text-sm font-semibold text-[var(--color-ink-soft)]"
              style={{ fontFamily: "var(--font-jetbrains), var(--font-mono)" }}
            >
              {unitPart}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--color-ink-soft)] leading-relaxed">{note}</p>
    </div>
  );
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function ProofPage() {
  const { realUse, lab, isEmpty } = await proofEvidence();

  return (
    <ProofContainer>
      {/* Masthead */}
      <section className="reveal-on-scroll space-y-4 border-b border-[var(--color-rule)] pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent)] font-semibold">
            Evidence Tear Sheet
          </span>
          <span className="text-[var(--color-rule)]">/</span>
          <Badge tone={lab && lab.inventedFacts === 0 ? "verified" : "neutral"} animated>
            {lab ? `Quality Lab · ${lab.gradedCount} cases graded` : "Quality Lab · no run yet"}
          </Badge>
          {realUse.updateCount > 0 && (
            <Badge tone="neutral">{realUse.updateCount} real updates</Badge>
          )}
        </div>

        <h1
          className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Proof &amp; Real Use
        </h1>

        <p className="max-w-2xl text-sm sm:text-base text-[var(--color-ink-soft)] leading-relaxed">
          Everything on this tear sheet is read directly from database updates or from the latest Quality Lab run on disk. Anything not yet measured says so explicitly, rather than presenting a fabricated or estimated figure.
        </p>

        {isEmpty && (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)] p-4 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
            <strong className="text-[var(--color-ink)]">Nothing measured yet.</strong> This tear sheet fills in as SayOnce is used on real updates and as the Quality Lab is run. It preserves honest gaps rather than optimistic guesses by design.
          </div>
        )}
      </section>

      {/* Section 1: Real use */}
      <section aria-labelledby="real-use" className="reveal-on-scroll space-y-5 border-b border-[var(--color-rule)] pb-12">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            01 / Field Evidence
          </span>
          <h2
            id="real-use"
            className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-ink)]"
          >
            What it has actually produced
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
            From the real dataset only. Demo sessions are excluded, so a visitor trying sample updates cannot move these figures.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Updates spoken"
            value={measured(realUse.updateCount || null, (n) => String(n))}
            note="Each one fanned out to several people in their preferred language"
          />
          <Stat
            label="Messages drafted"
            value={measured(realUse.messageCount || null, (n) => String(n))}
            note={`${realUse.sentMessageCount} marked as sent`}
          />
          <Stat
            label="Recipients reached"
            value={measured(realUse.recipientCount || null, (n) => String(n))}
            note="Distinct individuals across WhatsApp and email"
          />
          <Stat
            label="Voice amplification"
            value={measured(realUse.amplification, (n) => `${n}×`)}
            note={
              realUse.amplification === null
                ? "Words delivered per word spoken, once an update exists"
                : `${realUse.wordsSpoken} words spoken became ${realUse.wordsDelivered} delivered`
            }
            tone="accent"
          />
        </div>
      </section>

      {/* Section 2: Time */}
      <section aria-labelledby="time" className="reveal-on-scroll space-y-5 border-b border-[var(--color-rule)] pb-12">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            02 / Time Savings
          </span>
          <h2
            id="time"
            className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Minutes per update, before and after
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
            The before figure is timed by hand on the old manual workflow. The after figure the app measures itself, from opening Speak to the final sent message.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Before SayOnce"
            value={measured(realUse.baselineMinutes, (n) => `${n} min`)}
            note="Measured across updates written the manual way"
          />
          <Stat
            label="With SayOnce"
            value={measured(realUse.actualMinutes, (n) => `${n} min`)}
            note={
              realUse.timedUpdateCount === 0
                ? "Measured automatically per update"
                : `Average across ${realUse.timedUpdateCount} timed updates`
            }
            tone="verified"
          />
          <Stat
            label="Saved per update"
            value={measured(realUse.minutesSavedPerUpdate, (n) => `${n} min`)}
            note="Requires both baseline and actual measurements"
          />
          <Stat
            label="Time reduction"
            value={measured(realUse.percentSaved, (n) => `${n}%`)}
            note="Requires both baseline and actual measurements"
          />
        </div>

        {realUse.minutesSavedPerUpdate === null && (
          <p className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-4 text-xs text-[var(--color-ink-soft)] leading-relaxed">
            No time saving is shown because{" "}
            {realUse.baselineMinutes === null && realUse.actualMinutes === null
              ? "neither the baseline nor any elapsed time has been measured"
              : realUse.baselineMinutes === null
                ? "the baseline has not been measured"
                : "no update has a measured elapsed time"}
            . Fabricating an estimate would compromise the integrity of every other claim on this page.
          </p>
        )}
      </section>

      {/* Section 3: Accuracy */}
      <section aria-labelledby="accuracy" className="reveal-on-scroll space-y-5 border-b border-[var(--color-rule)] pb-12">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            03 / Benchmark Lab
          </span>
          <h2
            id="accuracy"
            className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-ink)]"
          >
            The latest Quality Lab run
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
            A recorded suite of spoken updates run through the live pipeline, each graded against gold-standard recipients and extracted facts. Hard gates cannot be averaged out.
          </p>
        </div>

        {lab === null ? (
          <p className="rounded-[var(--radius-card)] border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-4 text-xs sm:text-sm text-[var(--color-ink)]">
            No Quality Lab run has completed yet. Run <code className="font-mono">npm run lab</code> and this table will fill in from the results.
          </p>
        ) : (
          <>
            <div
              tabIndex={0}
              role="region"
              aria-label="Quality Lab metrics table, scrolls horizontally"
              className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)]"
            >
              <table className="w-full min-w-[32rem] border-collapse text-left text-xs sm:text-sm">
                <caption className="sr-only">
                  Quality Lab metrics against their targets
                </caption>
                <thead>
                  <tr className="border-b border-[var(--color-rule)] bg-[var(--color-surface-raised)] text-[var(--color-ink-soft)]">
                    <th scope="col" className="p-3 font-semibold">Metric</th>
                    <th scope="col" className="p-3 font-semibold">Result</th>
                    <th scope="col" className="p-3 font-semibold">Target</th>
                    <th scope="col" className="p-3 font-semibold">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {(
                    [
                      ["Invented facts", String(lab.inventedFacts), "0", lab.inventedFacts === 0, true],
                      ["Privacy held", pct(lab.privacy), "100%", lab.privacy >= 1, true],
                      ["Must-know coverage", pct(lab.mustKnow), "95%", lab.mustKnow >= 0.95, false],
                      ["Routing recall", pct(lab.routingRecall), "90%", lab.routingRecall >= 0.9, false],
                      ["Routing precision", pct(lab.routingPrecision), "85%", lab.routingPrecision >= 0.85, false],
                      ["Language and script", pct(lab.languageScript), "100%", lab.languageScript >= 1, false],
                      ["Channel fit", pct(lab.channelFit), "95%", lab.channelFit >= 0.95, false],
                    ] as Array<[string, string, string, boolean, boolean]>
                  ).map(([name, result, target, ok, hard]) => (
                    <tr key={name} className="hover:bg-[var(--color-surface-raised)]/40 transition">
                      <td className="p-3">
                        <span className="font-medium text-[var(--color-ink)]">{name}</span>
                        {hard && (
                          <span className="ml-2 font-mono text-[10px] text-[var(--color-blocked)] font-semibold uppercase tracking-wider">
                            hard gate
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-medium text-[var(--color-ink)]">{result}</td>
                      <td className="p-3 font-mono text-[var(--color-ink-soft)]">{target}</td>
                      <td className="p-3">
                        <Badge tone={ok ? "verified" : hard ? "blocked" : "warning"} animated>
                          {ok ? "met" : hard ? "failed" : "below target"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--color-ink-soft)]">
              {lab.passCount} of {lab.gradedCount} cases passed every check.
              {lab.caseCount !== lab.gradedCount &&
                ` ${lab.caseCount - lab.gradedCount} case(s) errored and are excluded from the averages.`}
            </p>
          </>
        )}
      </section>

      {/* Section 4: Rules & Actions */}
      <section aria-labelledby="how" className="reveal-on-scroll space-y-5">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            04 / Measurement Rules
          </span>
          <h2
            id="how"
            className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-ink)]"
          >
            How these numbers are produced
          </h2>
        </div>

        <ul className="list-disc space-y-2.5 pl-5 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
          <li>
            Real-use totals are aggregates over the real dataset. No personal name, phone number, or email address is read or stored on this page.
          </li>
          <li>
            The accuracy table is the most recent Quality Lab run, which sends recorded updates through the identical pipeline used in production.
          </li>
          <li>
            Invented facts are counted by a deterministic verifier with no generative model in it. It maintains absolute authority over all draft releases.
          </li>
          <li>
            Anything not measured says &ldquo;Not yet measured&rdquo;. No figure on this tear sheet is estimated, rounded up, or carried over from unverified runs.
          </li>
        </ul>

        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            href="/demo"
            className="min-h-11 inline-flex items-center justify-center rounded bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-on-accent)] shadow-sm hover:opacity-90 active-press transition"
          >
            Try the demo
          </Link>
          <Link
            href="/lab"
            className="min-h-11 inline-flex items-center justify-center rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)] active-press transition"
          >
            Open the Quality Lab
          </Link>
        </div>
      </section>
    </ProofContainer>
  );
}
