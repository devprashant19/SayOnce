import type { ReactNode } from "react";

type Tone = "accent" | "verified" | "review" | "blocked" | "neutral";

const LABEL: Record<Tone, string> = {
  accent: "text-[var(--color-accent)]",
  verified: "text-[var(--color-verified)]",
  review: "text-[var(--color-review)]",
  blocked: "text-[var(--color-blocked)]",
  neutral: "text-[var(--color-ink-soft)]",
};

const PILL: Record<Tone, string> = {
  accent: "bg-[var(--color-accent-wash)] text-[var(--color-accent)]",
  verified: "bg-[var(--color-verified-wash)] text-[var(--color-verified)]",
  review: "bg-[var(--color-warning-wash)] text-[var(--color-review)]",
  blocked: "bg-[var(--color-blocked-wash)] text-[var(--color-blocked)]",
  neutral: "bg-[var(--color-surface-raised)] text-[var(--color-ink-soft)]",
};

/**
 * Parity's counter card: a coloured label and a grey qualifier on top, a big
 * number with a status pill, a caption, and a footer line under a hairline.
 * Ported from Parity's SummaryCounters.
 *
 * `value` is rendered as given. Pass "Not yet measured" rather than a number
 * nobody has measured — the cards on /proof depend on that.
 */
export function CounterCard({
  label,
  meta,
  value,
  pill,
  caption,
  footer,
  tone = "accent",
  footerTone = "neutral",
  delayMs = 0,
}: {
  label: ReactNode;
  meta?: ReactNode;
  value: ReactNode;
  pill?: { icon?: ReactNode; text: ReactNode; tone?: Tone };
  caption?: ReactNode;
  footer?: ReactNode;
  tone?: Tone;
  footerTone?: Tone;
  delayMs?: number;
}) {
  // Numbers, with or without a unit, get the big figure; "Not yet measured"
  // and the like get body text, so an honest gap does not shout.
  const valueIsText = typeof value === "string" && !/^[\d.,%×x\s-]+(min)?$/.test(value);
  return (
    <div
      className="hover-card-lift animate-fade-in flex flex-col justify-between rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5"
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div>
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className={`font-medium ${LABEL[tone]}`}>{label}</span>
          {meta && <span className="text-[var(--color-ink-soft)]">{meta}</span>}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <span
            className={`font-semibold leading-none tracking-tight text-[var(--color-ink)] ${
              valueIsText ? "text-base" : "text-[28px]"
            }`}
          >
            {value}
          </span>
          {pill && (
            <span
              className={`animate-badge-pop inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                PILL[pill.tone ?? tone]
              }`}
            >
              {pill.icon}
              {pill.text}
            </span>
          )}
        </div>
        {caption && <p className="mt-1 text-[11px] text-[var(--color-ink-soft)]">{caption}</p>}
      </div>
      {footer && (
        <div
          className={`mt-4 border-t border-[var(--color-line)] pt-3 text-[11px] font-medium ${LABEL[footerTone]}`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
