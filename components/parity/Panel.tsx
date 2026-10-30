import type { ReactNode } from "react";

/**
 * Parity's white panel: an icon tile, a title with an optional orange tag and
 * a one-line subtitle, an action on the right, a hairline, then the body.
 * Ported from Parity's PacketPresetSelector, on SayOnce's theme tokens.
 */
export function Panel({
  icon,
  title,
  tag,
  subtitle,
  action,
  children,
  className = "",
  id,
  labelledBy,
}: {
  icon?: ReactNode;
  title: ReactNode;
  tag?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
  /** Pass the heading id so the panel is announced as a named region. */
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--color-line)] pb-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-raised)] text-[var(--color-ink)]">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3
              id={labelledBy}
              className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"
            >
              {title}
              {tag && <PanelTag>{tag}</PanelTag>}
            </h3>
            {subtitle && <p className="text-xs text-[var(--color-ink-soft)]">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
      </div>
      {children && <div className="mt-3.5">{children}</div>}
    </section>
  );
}

/** Parity's small orange tag, as in "Slice C". */
export function PanelTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--color-accent-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent)]">
      {children}
    </span>
  );
}

/** Parity's monospaced field chip, as in "Student Name (name)". */
export function MonoChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-ink-soft)]">
      {children}
    </span>
  );
}
