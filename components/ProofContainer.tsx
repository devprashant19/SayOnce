"use client";

import { useScrollReveal } from "@/lib/use-scroll-reveal";

export function ProofContainer({ children }: { children: React.ReactNode }) {
  const containerRef = useScrollReveal();

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-3xl space-y-16 py-8 sm:py-16"
    >
      {children}
    </div>
  );
}

