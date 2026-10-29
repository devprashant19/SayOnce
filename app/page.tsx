import Link from "next/link";

/**
 * Landing page, Phase 1 version.
 *
 * Phase 7 replaces this with the six-scene scroll story and the shared-element
 * transition into /app. Until then it stays a plain, honest page that loads
 * instantly and says the one true sentence — because a judge who opens the link
 * on day one should still understand the product in five seconds.
 *
 * Nothing here may ever carry an invented number, logo or testimonial.
 */
export default function LandingPage() {
  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-ink-faint)]">
          Ek Baar Bolo
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Say it once.
          <br />
          Everyone gets their version.
        </h1>
        <p className="mt-5 text-lg text-[var(--color-ink-soft)]">
          Speak one work update, in whatever mix of languages you actually
          think in. SayOnce works out who needs to know, writes each person
          their own message in their language, tone and channel, checks every
          draft against what you really said, and keeps the record for you.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="min-h-12 content-center rounded bg-[var(--color-accent)] px-6 text-sm font-semibold text-white"
            style={{ viewTransitionName: "speak-box" }}
          >
            Try it with your voice
          </Link>
          <Link
            href="/app?demo=1"
            className="min-h-12 content-center rounded border border-[var(--color-rule)] px-6 text-sm font-semibold"
          >
            Judge demo — no sign-in
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "One update, not one document",
            body: "Most voice tools turn one dictation into one document. SayOnce turns one dictation into a different message for each reader — different content, not just different wording.",
          },
          {
            title: "Nothing invented, ever",
            body: "A plain function, with no model in it, re-reads every draft against the facts you spoke. Anything it cannot account for is held back and shown to you, struck through.",
          },
          {
            title: "What you withhold stays withheld",
            body: "Say \"don't tell the vendor about the delay\" and that fact is locked. A draft that would leak it never reaches the send button.",
          },
          {
            title: "Your language, their language",
            body: "Language, script, channel and formality are settings on each person, not features of one country. Hinglish in, Devanagari and Spanish out.",
          },
          {
            title: "One tap to send",
            body: "WhatsApp opens on the right chat with the message filled in. Email opens with the subject and body ready. No messaging API, no account, nothing to break.",
          },
          {
            title: "The log writes itself",
            body: "Every update is saved with its facts, its decisions and who was told — the record a team never gets around to keeping.",
          },
        ].map((item) => (
          <article key={item.title}>
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              {item.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="border-t border-[var(--color-rule)] pt-6 text-sm text-[var(--color-ink-soft)]">
        <p>
          Built for anyone who coordinates people across languages and channels.
          India first, because that is where the problem is loudest.
        </p>
        <p className="mt-2">
          Built for the No Hands challenge, by voice.{" "}
          <Link href="/proof" className="underline">
            See the numbers
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
