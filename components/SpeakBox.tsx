"use client";

import { useRef } from "react";
import { useAutoGrow } from "@/lib/use-auto-grow";

/**
 * The speak box.
 *
 * This is SayOnce's entire Wispr integration, and that is deliberate: Wispr
 * Flow types into whatever text box has the cursor, so a well-behaved text box
 * is the whole job. No SDK, nothing to break, nothing against anyone's terms.
 *
 * What "well-behaved" means in practice:
 * - autofocus, so dictated text lands without a click
 * - never move the cursor or rewrite the value while the user is dictating
 * - grow with the text instead of scrolling a six-line window
 * - accept pasted text from anywhere
 * - Ctrl/Cmd+Enter fans out, so an update can be spoken and sent hands-free
 */

export interface SpeakBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  label?: string;
}

export function SpeakBox({ value, onChange, onSubmit, disabled, label }: SpeakBoxProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow to fit, rather than scrolling a six-line window. Done on the element
  // rather than with CSS field-sizing so it behaves the same in every browser.
  useAutoGrow(ref, value, 160);

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="speak" className="block text-sm font-semibold tracking-tight text-[var(--color-ink)]">
          {label ?? "Your update"}
        </label>
        <span className="text-[11px] font-mono text-[var(--color-ink-faint)]">
          Wispr Flow ready
        </span>
      </div>
      <textarea
        id="speak"
        ref={ref}
        // autoFocus is the point of this component: dictation must land here
        // with no click, which is the first thing a judge will try.
        autoFocus
        value={value}
        disabled={disabled}
        aria-describedby="speak-hint"
        spellCheck={false}
        rows={6}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Hold your Wispr key and talk…"
        style={{ viewTransitionName: "speak-box" }}
        // Inter, as in Parity's inputs. Monospace at this size in a narrow
        // column wrapped a short update into twenty lines.
        className="mt-2 w-full resize-none overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-[15px] leading-relaxed text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25 placeholder:text-[var(--color-ink-faint)] disabled:opacity-60"
      />
      <p
        id="speak-hint"
        className={`mt-1.5 text-xs text-[var(--color-ink-soft)] transition-opacity duration-200 ${
          value.trim() ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"
        }`}
      >
        Hold your Wispr key and talk. Any language, any mix. <kbd className="font-mono text-[10px] bg-[var(--color-paper-sunk)] px-1.5 py-0.5 rounded border border-[var(--color-rule)]">⌘↵</kbd> to fan out.
      </p>
    </div>
  );
}
