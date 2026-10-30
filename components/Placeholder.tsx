import Link from "next/link";

/**
 * An honest placeholder. Every unbuilt screen says which phase builds it and
 * what it will do, so a screen is never silently empty and the build's own
 * state is readable from the app.
 */
export function Placeholder({
  title,
  phase,
  summary,
  bullets,
}: {
  title: string;
  phase: string;
  summary: string;
  bullets: string[];
}) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm font-medium text-[var(--color-ink-faint)]">
        Built in {phase}
      </p>
      <p className="mt-4 text-[var(--color-ink-soft)]">{summary}</p>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-[var(--color-ink-soft)]">
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Link
        href="/app"
        className="mt-6 inline-block min-h-11 content-center rounded bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-on-accent)]"
      >
        Go to Speak
      </Link>
    </div>
  );
}
