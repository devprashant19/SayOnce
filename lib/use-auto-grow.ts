"use client";

import { useEffect, type RefObject } from "react";

/**
 * Grows a textarea to fit its text, so nothing is ever hidden behind a
 * scrollbar inside a box. Re-measures when the text changes, when the box
 * changes width (lines re-wrap), and once the web fonts have loaded (glyph
 * widths change). Measuring only on change left a dictated update cut off
 * whenever the font arrived after the first measure.
 */
export function useAutoGrow(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  minHeight = 0,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight + 2, minHeight)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [ref, value, minHeight]);
}
