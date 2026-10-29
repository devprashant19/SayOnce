import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import { SayOnceWordmark } from "@/components/SayOnceLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "SayOnce — say it once, everyone gets their version",
  description:
    "Speak one work update. SayOnce decides who needs to know, writes each person their own message in their language, tone and channel, checks every draft against what you said, and logs it.",
  openGraph: {
    title: "SayOnce",
    description: "Say it once. Everyone gets their version.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const NAV = [
  { href: "/app", label: "Speak" },
  { href: "/people", label: "People Book" },
  { href: "/log", label: "Update Log" },
  { href: "/lab", label: "Quality Lab" },
  { href: "/proof", label: "Proof" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--color-accent)] focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]/90 backdrop-blur-sm sticky top-0 z-40">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center py-1 hover:opacity-90 transition active-press"
              aria-label="SayOnce Home"
            >
              <SayOnceWordmark size={28} animated />
            </Link>
            <nav aria-label="Main" className="flex flex-wrap items-center gap-x-1 sm:gap-x-2 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 items-center px-2 py-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/app?demo=1"
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-raised)] px-3.5 text-xs font-semibold hover:bg-[var(--color-line)] transition active-press"
              >
                Judge demo
              </Link>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
