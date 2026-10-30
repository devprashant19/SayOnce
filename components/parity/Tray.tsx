import type { ReactNode } from "react";

/**
 * Parity's warm tray (#f5f2ee): "Step N • label" in orange and grey, a title,
 * a subtitle, actions on the right, a hairline, the body, and an optional
 * action bar along the bottom. Ported from Parity's IngestionZone.
 */
export function Tray({
  step,
  label,
  title,
  titleId,
  subtitle,
  caption,
  actions,
  footer,
  children,
  className = "",
  id,
}: {
  step: ReactNode;
  label: ReactNode;
  title: ReactNode;
  /** Heading id, so the tray is announced as a named region. */
  titleId: string;
  subtitle?: ReactNode;
  caption?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={`rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper-sunk)] p-4 shadow-md sm:p-6 ${className}`}
    >
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-line)] pb-5 md:flex-row md:items-center">
        <div className="min-w-0">
          <StepLabel step={step} label={label} />
          <h2
            id={titleId}
            className="font-display mt-0.5 text-lg font-semibold text-[var(--color-ink)] sm:text-xl"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 max-w-2xl text-xs text-[var(--color-ink-soft)] sm:text-sm">{subtitle}</p>
          )}
          {caption && (
            <span className="mt-0.5 block text-[11px] text-[var(--color-ink-soft)]">{caption}</span>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
      {footer && (
        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-[var(--color-line)] pt-4 sm:flex-row sm:items-center">
          {footer}
        </div>
      )}
    </section>
  );
}

/** "Step 1 • Ingestion Tray": the step in orange, a dot, the label in grey. */
export function StepLabel({ step, label }: { step: ReactNode; label: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span className="text-[var(--color-accent)]">{step}</span>
      <span aria-hidden="true" className="text-[var(--color-ink-faint)]">
        •
      </span>
      <span className="text-[var(--color-ink-soft)]">{label}</span>
    </div>
  );
}
