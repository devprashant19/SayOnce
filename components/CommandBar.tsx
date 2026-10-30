"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { parseCommand, type ParsedCommand } from "@/lib/command-bar";

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (command: ParsedCommand) => void;
}

export function CommandBar({ isOpen, onClose, onExecute }: CommandBarProps) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedCommand | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput("");
      setParsed(null);
      setAwaitingConfirm(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleInputChange = (text: string) => {
    setInput(text);
    if (text.trim().length > 0) {
      const result = parseCommand(text);
      setParsed(result);
    } else {
      setParsed(null);
    }
    setAwaitingConfirm(false);
  };

  const handleRun = useCallback(() => {
    if (!parsed || parsed.action === "unknown") return;

    if (parsed.requiresConfirmation && !awaitingConfirm) {
      setAwaitingConfirm(true);
      return;
    }

    onExecute(parsed);
    onClose();
  }, [parsed, awaitingConfirm, onExecute, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Command Bar"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 backdrop-blur-xs sm:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--color-paper-sunk)] text-xs font-semibold text-[var(--color-ink-soft)]">
              ⌘K
            </span>
            <h2 className="text-sm font-semibold tracking-tight">Voice Command Bar</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)] hover:text-[var(--color-ink)]"
            aria-label="Close command bar"
          >
            Esc
          </button>
        </div>

        <div className="mt-3">
          <label htmlFor="command-input" className="sr-only">
            Dictate or type a command
          </label>
          <input
            id="command-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRun();
              }
            }}
            placeholder="Say or type a command… (e.g. 'send everyone except Ramesh')"
            className="w-full min-h-11 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 text-base outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {parsed !== null && (
          <div className="mt-3 space-y-2 rounded-lg border border-[var(--color-rule)] p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                Recognized Action
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  parsed.action === "unknown"
                    ? "bg-[var(--color-warning-wash)] text-[var(--color-warning)]"
                    : "bg-[var(--color-verified-wash)] text-[var(--color-verified)]"
                }`}
              >
                {parsed.action}
              </span>
            </div>
            <p className="text-[var(--color-ink)]">{parsed.feedback}</p>

            {awaitingConfirm && parsed.confirmationMessage && (
              <div className="mt-2 rounded bg-[var(--color-warning-wash)] p-2 text-xs font-medium text-[var(--color-warning)]">
                ⚠️ {parsed.confirmationMessage}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="text-xs text-[var(--color-ink-faint)]">
            Try: <span className="text-[var(--color-ink-soft)]">&quot;send all&quot;</span>,{" "}
            <span className="text-[var(--color-ink-soft)]">&quot;switch Priya to Hindi&quot;</span>,{" "}
            <span className="text-[var(--color-ink-soft)]">&quot;clear&quot;</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded px-3 py-2 text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={!parsed || parsed.action === "unknown"}
              className="min-h-11 rounded bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[var(--color-on-accent)] disabled:opacity-50"
            >
              {awaitingConfirm ? "Confirm Action" : "Execute"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

