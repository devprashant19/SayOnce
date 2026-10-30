import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Parity's accent face. Only ever one italic word at a time; see .font-accent.
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const SITE = "https://say-once-kappa.vercel.app";

/**
 * `metadataBase` is what makes the Open Graph image resolve to an absolute
 * URL. Without it Next emits a relative path and every scraper — Slack,
 * WhatsApp, LinkedIn, Devpost — silently shows no card at all.
 *
 * The icons are deliberately not declared here. Next serves `app/icon.svg`,
 * `app/apple-icon.png` and `app/opengraph-image.png` by file convention and
 * emits the tags itself; listing them again only lets the two drift apart.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "SayOnce — say it once, everyone gets their version",
    template: "%s — SayOnce",
  },
  description:
    "Speak one work update. SayOnce decides who needs to know, writes each person their own message in their language, tone and channel, checks every draft against what you said, and logs it.",
  applicationName: "SayOnce",
  authors: [{ name: "Dev Prashant" }],
  creator: "Dev Prashant",
  keywords: [
    "voice",
    "dictation",
    "work updates",
    "Hinglish",
    "provenance",
    "Wispr Flow",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "SayOnce",
    locale: "en_IN",
    title: "SayOnce — say it once, everyone gets their version",
    description: "Say it once. Everyone gets their version.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SayOnce",
    description: "Say it once. Everyone gets their version.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Applies a saved dark-mode choice before first paint, so nobody who opted in
 * sees a flash of the light page. Light is the default and needs no script:
 * Parity ships light, and so does this.
 */
const THEME_SCRIPT = `try{if(localStorage.getItem("sayonce-theme")==="dark"){document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark")}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrument.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-accent)] focus:px-4 focus:py-2 focus:text-[var(--color-on-accent)]"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
