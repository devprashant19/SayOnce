/**
 * The SayOnce mark.
 *
 * A spoken waveform on the left — three bars with a real speech envelope,
 * short, tall, medium — fanning into three rays on the right, each a different
 * length, each fading further out. One utterance, three different versions.
 *
 * The voice read is deliberate: this is a Wispr Flow entry, and a mark that is
 * only an abstract fan says nothing about speech. It is still not a microphone
 * glyph, because the product is not a recorder — what it does with the voice is
 * the point, so the mark shows the fan-out, not the input device.
 *
 * Checked by rendering at 16, 24, 32, 64 and 180px. The opacity floor is 0.65
 * rather than 0.5 because anything fainter disappears in a 16px favicon, and
 * the rays vary by length as well as opacity so the falloff survives at any
 * size. Three bars, not four: four has a better envelope at 180px and turns to
 * mud at 16px.
 *
 * It draws in `currentColor` by default, so it inherits the text colour of
 * wherever it sits. Pass `tone="brand"` for Parity's orange.
 *
 * The colour goes in a style, not the `stroke` attribute. SVG presentation
 * attributes cannot resolve var(), so `stroke="var(--...)"` is discarded and
 * the mark renders invisible — which is exactly what happened to the old one
 * in the header.
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
  /** Staggers the bars then the rays, left to right. Reduced-motion safe. */
  animated?: boolean;
}

export function SayOnceLogo({
  size = 28,
  tone = "current",
  decorative = false,
  className = "",
  animated = false,
}: SayOnceLogoProps) {
  const stroke = tone === "brand" ? "var(--color-brand)" : "currentColor";

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
      <g style={{ stroke }} strokeWidth={3} strokeLinecap="round" fill="none">
        {/* the voice: a speech envelope, not a bar chart */}
        <path d="M4.5 13V19" className={animated ? "logo-origin" : undefined} />
        <path d="M9 7V25" className={animated ? "logo-fan logo-fan-1" : undefined} />
        <path d="M13.5 11V21" className={animated ? "logo-fan logo-fan-2" : undefined} />
        {/* the versions: three, each different, fading outward */}
        <path d="M19 9H27" className={animated ? "logo-fan logo-fan-3" : undefined} />
        <path
          d="M19 16H29"
          opacity={0.82}
          className={animated ? "logo-fan logo-fan-4" : undefined}
        />
        <path
          d="M19 23H25"
          opacity={0.65}
          className={animated ? "logo-fan logo-fan-5" : undefined}
        />
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
