"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface TourStep {
  title: string;
  badge: string;
  description: string;
  targetId: string;
  /**
   * The control this step asks you to press. On a phone the step card covers
   * the bottom of the screen, and step 1 once hid the very Fan out button it
   * told you to press; the page now scrolls this control clear of the card.
   */
  actionId?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "1. Fan out your update",
    badge: "Step 1 of 5",
    description:
      "Press the 'Fan out' button (or hit Ctrl/Cmd+Enter) to transform the spoken update into separate personalized messages.",
    // The whole Step 1 tray, heading included. Ringing only the controls
    // beneath the heading scrolled the heading up under the navbar.
    targetId: "speak-tray",
    actionId: "fanout-button",
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
    actionId: "verify-trail-button",
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  hasResult?: boolean;
  onEnsureResult?: () => void;
}

export function GuidedTour({
  isOpen,
  onClose,
  hasResult = true,
  onEnsureResult,
}: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStepIndex]!;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const updateSpotlight = useCallback(() => {
    if (!isOpen) {
      setTargetRect(null);
      return;
    }

    const currentStep = TOUR_STEPS[currentStepIndex];
    if (!currentStep) return;

    const el = document.getElementById(currentStep.targetId);
    if (el) {
      const details = el.closest("details");
      if (details && !details.open) {
        details.open = true;
      }
      // Ring only what is on screen. A target taller than the viewport, or
      // partly scrolled away, drew a ring past the screen edge and under the
      // sticky navbar. Clamp to the visible band below the navbar.
      const r = el.getBoundingClientRect();
      const header = document.querySelector("header")?.getBoundingClientRect();
      const topLimit = Math.max(8, (header?.bottom ?? 0) + 8);
      const bottomLimit = window.innerHeight - 8;
      const top = Math.max(r.top - 8, topLimit);
      const bottom = Math.min(r.bottom + 8, bottomLimit);
      if (bottom - top < 24) {
        setTargetRect(null);
        return;
      }
      setTargetRect({
        top,
        left: Math.max(8, r.left - 8),
        width: Math.min(r.width + 16, window.innerWidth - 16),
        height: bottom - top,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStepIndex]);

  // Handle step positioning and scrolling
  useEffect(() => {
    if (!isOpen) return;

    if (currentStepIndex > 0 && !hasResult && onEnsureResult) {
      onEnsureResult();
    }

    const timer = setTimeout(() => {
      const currentStep = TOUR_STEPS[currentStepIndex];
      if (!currentStep) return;

      const el = document.getElementById(currentStep.targetId);
      if (el) {
        const details = el.closest("details");
        if (details && !details.open) {
          details.open = true;
        }
        // Centre a target that fits; a taller one is aligned to its top, which
        // the page's scroll-padding places just below the sticky navbar.
        const fits = el.getBoundingClientRect().height < window.innerHeight - 160;
        el.scrollIntoView({ behavior: "smooth", block: fits ? "center" : "start" });
      }
      updateSpotlight();
    }, 60);

    const secondaryTimer = setTimeout(updateSpotlight, 350);

    // Once the smooth scroll has landed, make sure the control this step asks
    // for is not under the step card; lift it just clear if it is.
    const actionTimer = setTimeout(() => {
      const actionId = TOUR_STEPS[currentStepIndex]?.actionId;
      const action = actionId ? document.getElementById(actionId) : null;
      const card = cardRef.current;
      if (!action || !card) return;
      const a = action.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      const overlapsHorizontally = a.right > c.left && a.left < c.right;
      if (overlapsHorizontally && a.bottom > c.top - 12) {
        window.scrollBy({ top: a.bottom - c.top + 24, behavior: "smooth" });
      }
    }, 650);

    return () => {
      clearTimeout(timer);
      clearTimeout(secondaryTimer);
      clearTimeout(actionTimer);
    };
  }, [isOpen, currentStepIndex, hasResult, onEnsureResult, updateSpotlight]);

  // Recalculate on window scroll and resize
  useEffect(() => {
    if (!isOpen) return;
    // Capture, so a scroll inside any container moves the ring too.
    window.addEventListener("scroll", updateSpotlight, { passive: true, capture: true });
    window.addEventListener("resize", updateSpotlight, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateSpotlight, { capture: true });
      window.removeEventListener("resize", updateSpotlight);
    };
  }, [isOpen, updateSpotlight]);

  // Keyboard navigation: Escape to skip, ArrowRight / Enter to advance, ArrowLeft to go back
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentStepIndex((prev) => (prev < TOUR_STEPS.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.max(0, prev - 1));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Spotlight Ring using box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.55) so nothing shifts */}
      {targetRect && (
        <div
          data-testid="tour-spotlight"
          // Above the sticky navbar (z-40) so it is dimmed with everything
          // else, below the step card (z-50). The rect is already padded and
          // clamped to the visible band in updateSpotlight.
          className="fixed pointer-events-none z-[45] rounded-2xl transition-all duration-300"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)",
            border: "2px solid var(--color-accent)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Floating step card, bottom-right */}
      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby="tour-step-title"
        aria-modal="false"
        // A compact sheet across the bottom on a phone, a card bottom-right
        // from sm up. Less of the page is hidden under it on a small screen.
        className="fixed inset-x-3 bottom-3 z-50 rounded-[var(--radius-card)] border-2 border-[var(--color-accent)] bg-[var(--color-paper)] p-4 shadow-2xl animate-fade-in sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96 sm:p-5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--color-accent)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--color-accent)]">
              {step.badge}
            </span>
            <span className="text-[11px] font-mono text-[var(--color-ink-soft)]">
              {currentStepIndex + 1} / {TOUR_STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)] transition"
            aria-label="Skip tour"
          >
            Skip tour ✕
          </button>
        </div>

        <div className="mt-3.5 space-y-1.5">
          <h3
            id="tour-step-title"
            className="font-display text-base font-semibold text-[var(--color-ink)]"
          >
            {step.title}
          </h3>
          <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
            {step.description}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-rule)] pt-3">
          <button
            type="button"
            onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentStepIndex === 0}
            className="min-h-11 px-3 inline-flex items-center rounded-lg text-xs font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)] disabled:opacity-30 disabled:pointer-events-none transition"
            aria-label="Previous step"
          >
            ← Back
          </button>

          {/* Progress dot row */}
          <div className="flex items-center gap-1" role="group" aria-label="Tour progress">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStepIndex(i)}
                className="min-h-11 min-w-6 inline-flex items-center justify-center py-2 group"
                aria-label={`Go to step ${i + 1}: ${TOUR_STEPS[i]!.title}`}
                aria-current={i === currentStepIndex ? "step" : undefined}
              >
                <span
                  className={`h-2 rounded-full transition-all ${
                    i === currentStepIndex
                      ? "w-5 bg-[var(--color-accent)]"
                      : "w-2 bg-[var(--color-rule)] group-hover:bg-[var(--color-ink-soft)]"
                  }`}
                />
              </button>
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
            className="min-h-11 px-4 inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-on-accent)] shadow-xs hover:opacity-90 active-press transition"
            aria-label={isLast ? "Complete tour" : "Next step"}
          >
            {isLast ? "Done ✓" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}
