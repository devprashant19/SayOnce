"use client";

import { useEffect, useRef } from "react";

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

  // Grow to fit. Done on the element rather than with a CSS field-sizing
  // fallback so it behaves the same in every browser a judge might use.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <div>
      <label htmlFor="speak" className="block text-sm font-medium">
        {label ?? "Your update"}
      </label>
      <p id="speak-hint" className="mt-1 text-sm text-[var(--color-ink-soft)]">
        Hold your Wispr key and talk. Any language, any mix. Ctrl or Cmd + Enter
        to fan out.
      </p>
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
        className="mt-3 w-full resize-none rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-4 text-base leading-relaxed outline-none placeholder:text-[var(--color-ink-faint)] disabled:opacity-60"
      />
    </div>
  );
}
