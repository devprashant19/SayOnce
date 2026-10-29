"use client";

import { useEffect, useRef } from "react";

/**
 * Progressive enhancement scroll reveal hook.
 *
 * 1. Content is VISIBLE by default in pure CSS (opacity: 1).
 * 2. Only after hydration does this hook add `js-reveal` to <html>,
 *    enabling the CSS reveal transition.
 * 3. An IntersectionObserver reveals elements as they cross 10% into view.
 * 4. With prefers-reduced-motion: reduce, content stays visible instantly.
 */
export function useScrollReveal() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    document.documentElement.classList.add("js-reveal");

    const root = containerRef.current;
    if (!root) return;

    if (!("IntersectionObserver" in window)) {
      root.querySelectorAll(".reveal-on-scroll").forEach((el) => {
        el.classList.add("is-revealed");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    const elements = root.querySelectorAll(".reveal-on-scroll");
    if (elements.length > 0) {
      elements.forEach((el) => observer.observe(el));
    } else if (root.classList.contains("reveal-on-scroll")) {
      observer.observe(root);
    }

    return () => observer.disconnect();
  }, []);

  return containerRef;
}

