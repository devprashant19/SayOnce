import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--color-accent)] focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <header className="border-b border-[var(--color-rule)]">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              SayOnce
            </Link>
            <nav aria-label="Main" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/app?demo=1"
              className="ml-auto rounded border border-[var(--color-rule)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-paper-sunk)]"
            >
              Judge demo
            </Link>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
