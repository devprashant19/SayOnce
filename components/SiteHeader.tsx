"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Menu, X } from "lucide-react";
import { SayOnceWordmark } from "@/components/SayOnceLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/app", label: "Speak" },
  { href: "/people", label: "People" },
  { href: "/log", label: "Log" },
  { href: "/lab", label: "Lab" },
  { href: "/proof", label: "Proof" },
];

/**
 * Parity's floating pill navbar: one white capsule, sticky a few pixels from
 * the top, with the brand on the left, links in the middle and the one action
 * on the right. The current page carries Parity's small orange dot.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-2 z-40 flex w-full justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="relative flex w-full max-w-[1000px] items-center justify-between rounded-full border border-[var(--color-line)] bg-[var(--color-surface)]/95 py-1.5 pl-3 pr-1.5 shadow-sm backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full pr-1 active-press"
            aria-label="SayOnce home"
          >
            <SayOnceWordmark size={30} animated />
          </Link>
          <span className="hidden items-center rounded-full bg-[var(--color-surface-raised)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)] lg:inline-flex">
            Ek Baar Bolo
          </span>
        </div>

        <nav aria-label="Main" className="hidden items-center gap-1 text-[13px] font-medium md:flex">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 transition-colors ${
                  active
                    ? "font-semibold text-[var(--color-ink)]"
                    : "text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]"
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--color-verified)]/25 bg-[var(--color-verified-wash)] px-3 py-1 text-[11px] font-medium text-[var(--color-verified)] lg:inline-flex">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-verified)]" />
            Checker live
          </span>
          <ThemeToggle />
          <Link href="/app?demo=1" className="btn-pill btn-accent hidden !shadow-none sm:inline-flex">
            Judge demo
            <span className="btn-chip" aria-hidden="true">
              <ChevronRight size={15} strokeWidth={2.5} />
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)] md:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div
            id="mobile-nav"
            className="animate-fade-in absolute left-2 right-2 top-full z-50 mt-2 flex flex-col gap-1 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-xl md:hidden"
          >
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm ${
                    active
                      ? "font-semibold text-[var(--color-ink)]"
                      : "font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-raised)]"
                  }`}
                >
                  {active && (
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
                  )}
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/app?demo=1"
              onClick={() => setOpen(false)}
              className="btn-pill btn-accent mt-2 justify-between !shadow-none"
            >
              Judge demo — no sign-in
              <span className="btn-chip" aria-hidden="true">
                <ChevronRight size={15} strokeWidth={2.5} />
              </span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
