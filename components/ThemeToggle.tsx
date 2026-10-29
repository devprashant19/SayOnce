"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("sayonce-theme");
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
        document.documentElement.setAttribute("data-theme", stored);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch {
      // In private browsing or sandboxed environments, localStorage access might throw
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    // Add theme-transition class for 250ms cross-fade
    document.documentElement.classList.add("theme-transition");
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.setAttribute("data-theme", nextTheme);

    try {
      localStorage.setItem("sayonce-theme", nextTheme);
    } catch {
      // ignore
    }

    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 250);
  }

  if (!mounted) {
    return <div className="h-11 w-11" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark (Obsidian)" : "light"} mode`}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-raised)] transition active-press cursor-pointer"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

