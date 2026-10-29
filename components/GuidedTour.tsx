"use client";

import { useState, useEffect } from "react";

export interface TourStep {
  title: string;
  description: string;
  targetId?: string;
  badge?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "1. Fan out your update",
    badge: "Step 1 of 5",
    description:
      "Press the 'Fan out' button (or hit Ctrl/Cmd+Enter) to transform the spoken update into separate personalized messages.",
    targetId: "fanout-controls",
  },
  {
    title: "2. The Knowledge Matrix",
    badge: "Step 2 of 5",
    description:
      "Inspect Who Knows What. Green checks indicate routed facts; red locks show sensitive facts withheld from that recipient.",
    targetId: "knowledge-matrix-section",
  },
  {
    title: "3. Hover for Provenance",
    badge: "Step 3 of 5",
    description:
      "Hover over any sentence in a draft card to highlight the exact spoken words and extracted facts that produced it.",
    targetId: "drafts-section",
  },
  {
    title: "4. The Privacy Shield",
    badge: "Step 4 of 5",
    description:
      "Inspect Priya's draft versus Suresh's card. Notice the vendor shortage is strictly withheld from the client. Zero leaks.",
    targetId: "privacy-shield-section",
  },
  {
    title: "5. Verify Trust Trail",
    badge: "Step 5 of 5",
    description:
      "Every update, routing decision, and draft is cryptographically chained with SHA-256 hashes. Click 'Verify trail' to confirm tamper-evident proof.",
    targetId: "trail-section",
  },
];

export interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuidedTour({ isOpen, onClose }: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const step = TOUR_STEPS[currentStepIndex];
      if (step?.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStepIndex]!;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-labelledby="tour-step-title"
      aria-modal="false"
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-paper)] p-5 shadow-2xl transition-all"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-2.5">
        <span className="rounded bg-[var(--color-accent-wash)] px-2 py-0.5 text-xs font-bold text-[var(--color-accent)]">
          {step.badge}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          aria-label="Skip tour"
        >
          Skip tour ✕
        </button>
      </div>

      <div className="mt-3">
        <h3 id="tour-step-title" className="text-sm font-bold text-[var(--color-ink)]">
          {step.title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-soft)]">
          {step.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-rule)]">
        <button
          type="button"
          onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentStepIndex === 0}
          className="rounded px-2.5 py-1 text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)] disabled:opacity-30"
        >
          ← Back
        </button>

        <div className="flex items-center gap-1">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStepIndex
                  ? "w-4 bg-[var(--color-accent)]"
                  : "w-1.5 bg-[var(--color-rule)]"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (isLast) {
              onClose();
            } else {
              setCurrentStepIndex((prev) => prev + 1);
            }
          }}
          className="rounded bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:opacity-90"
        >
          {isLast ? "Done ✓" : "Next →"}
        </button>
      </div>
    </div>
  );
}

