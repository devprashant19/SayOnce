"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL_TICKS = 40;

/**
 * Parity's 40-tick semicircle gauge, counting up to its value. Ported from
 * Parity's Gauge.
 *
 * Colours go through `style`, not SVG attributes: presentation attributes
 * cannot resolve var(), which is how the SayOnce logo once rendered invisible.
 * Under prefers-reduced-motion it shows the value at once.
 */
export function Gauge({
  value,
  color = "var(--color-brand)",
  label,
  min = "0%",
  max = "100%",
}: {
  /** 0 to 100. */
  value: number;
  color?: string;
  /** What the percentage measures, for screen readers. */
  label: string;
  min?: string;
  max?: string;
}) {
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const [shown, setShown] = useState(target);
  const from = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(target);
      from.current = target;
      return;
    }
    const start = from.current;
    let raf = 0;
    let t0: number | null = null;
    const step = (now: number) => {
      t0 ??= now;
      const progress = Math.min((now - t0) / 650, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      setShown(current);
      from.current = current;
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const active = Math.round((shown / 100) * TOTAL_TICKS);

  return (
    <div className="mx-auto flex w-full max-w-[240px] flex-col items-center">
      <svg
        viewBox="0 0 200 120"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${label}: ${target}%`}
      >
        {Array.from({ length: TOTAL_TICKS }, (_, i) => {
          const angle = Math.PI + (i / (TOTAL_TICKS - 1)) * Math.PI;
          const on = i < active;
          return (
            <line
              key={i}
              x1={100 + 70 * Math.cos(angle)}
              y1={100 + 70 * Math.sin(angle)}
              x2={100 + 80 * Math.cos(angle)}
              y2={100 + 80 * Math.sin(angle)}
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{
                stroke: on ? color : "var(--color-ink-faint)",
                opacity: on ? 1 : 0.35,
                transition: "stroke 300ms var(--ease), opacity 300ms var(--ease)",
              }}
            />
          );
        })}
        <text
          x={100}
          y={105}
          textAnchor="middle"
          aria-hidden="true"
          style={{ fill: "var(--color-ink)", fontSize: 22, fontWeight: 600 }}
        >
          {shown}%
        </text>
      </svg>
      <div className="-mt-1 flex w-full max-w-[180px] justify-between px-1 text-[11px] font-medium text-[var(--color-ink-soft)]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
