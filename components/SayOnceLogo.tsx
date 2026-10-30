/**
 * The SayOnce mark.
 *
 * One voice becomes many: a single solid origin fanning out 1 → 2 → 3, with
 * opacity falling off by depth. Pure circles, so it stays legible at 16px in a
 * favicon and at 160px in the landing hero.
 *
 * It draws in `currentColor` by default, so it inherits the text colour of
 * wherever it sits. Pass `tone="brand"` for Parity's orange.
 *
 * The colour goes in a style, not the `fill` attribute. SVG presentation
 * attributes cannot resolve var(), so `fill="var(--...)"` is discarded and the
 * circles inherit the root's `fill="none"` — the mark rendered invisible in
 * the header for exactly that reason.
 *
 * This is the only logo in the product. Do not draw a second one, do not add
 * a wordmark graphic — the word "SayOnce" is set beside it.
 */

export interface SayOnceLogoProps {
  /** Rendered pixel size. The mark is square. */
  size?: number;
  tone?: "current" | "brand";
  /** Set true when a visible "SayOnce" wordmark sits next to it. */
  decorative?: boolean;
  className?: string;
  /** Animates the fan on mount. Respects prefers-reduced-motion in CSS. */
  animated?: boolean;
}

export function SayOnceLogo({
  size = 28,
  tone = "current",
  decorative = false,
  className = "",
  animated = false,
}: SayOnceLogoProps) {
  const fill = tone === "brand" ? "var(--color-brand)" : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "SayOnce"}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      {!decorative && <title>SayOnce</title>}
      <g style={{ fill }}>
        <circle cx="5" cy="16" r="4.5" className={animated ? "logo-origin" : undefined} />
        <circle cx="15.5" cy="10.5" r="3.2" opacity="0.78" className={animated ? "logo-fan logo-fan-1" : undefined} />
        <circle cx="15.5" cy="21.5" r="3.2" opacity="0.78" className={animated ? "logo-fan logo-fan-2" : undefined} />
        <circle cx="25.5" cy="6" r="2.4" opacity="0.52" className={animated ? "logo-fan logo-fan-3" : undefined} />
        <circle cx="25.5" cy="16" r="2.4" opacity="0.52" className={animated ? "logo-fan logo-fan-4" : undefined} />
        <circle cx="25.5" cy="26" r="2.4" opacity="0.52" className={animated ? "logo-fan logo-fan-5" : undefined} />
      </g>
    </svg>
  );
}

/**
 * The mark plus the wordmark, as used in the header. Set the way Parity sets
 * its own name: Inter, semibold, tight. The mark is decorative here because
 * the text already names the product for a screen reader.
 */
export function SayOnceWordmark({
  size = 28,
  className = "",
  animated = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SayOnceLogo size={size} tone="brand" decorative animated={animated} />
      <span
        className="font-semibold tracking-tight text-[var(--color-ink)]"
        style={{ fontSize: size * 0.64, lineHeight: 1 }}
      >
        SayOnce
      </span>
    </span>
  );
}
