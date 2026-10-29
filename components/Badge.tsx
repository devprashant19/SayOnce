type Tone = "verified" | "warning" | "blocked" | "locked" | "neutral";

const TONES: Record<Tone, string> = {
  verified:
    "bg-[var(--color-verified-wash)] text-[var(--color-verified)] border-[var(--color-verified)]/30",
  warning:
    "bg-[var(--color-warning-wash)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
  blocked:
    "bg-[var(--color-blocked-wash)] text-[var(--color-blocked)] border-[var(--color-blocked)]/30",
  locked: "bg-[var(--color-paper-sunk)] text-[var(--color-locked)] border-[var(--color-rule)]",
  neutral: "bg-[var(--color-paper-sunk)] text-[var(--color-ink-soft)] border-[var(--color-rule)]",
};

/**
 * A badge is the only place colour is allowed to mean something, so each tone
 * also carries its meaning in words — colour alone never conveys state.
 */
export function Badge({
  tone = "neutral",
  children,
  title,
  animated = false,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  title?: string;
  animated?: boolean;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${
        animated ? "animate-badge-pop" : ""
      } ${className}`}
    >
      {children}
    </span>
  );
}
