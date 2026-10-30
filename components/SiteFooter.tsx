import { SayOnceLogo } from "@/components/SayOnceLogo";

/**
 * Parity's footer: one centred line with the mark, then a warm box stating
 * exactly what the product does and does not do. Each line here describes
 * behaviour the code enforces; nothing is a promise the tests do not check.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--color-line)] py-8 text-center text-xs text-[var(--color-ink-soft)]">
      <div className="mx-auto max-w-4xl space-y-4 px-4">
        <div className="flex items-center justify-center gap-2 font-medium text-[var(--color-ink)]">
          <SayOnceLogo size={16} tone="brand" decorative />
          <span>SayOnce · Ek Baar Bolo · built for the Wispr Flow voice challenge</span>
        </div>

        <div className="space-y-2.5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-sunk)] p-5 text-left leading-relaxed shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)]">
            What SayOnce does, and does not do
          </span>
          <ul className="list-disc space-y-1.5 pl-5 text-[11px]">
            <li>
              <strong className="text-[var(--color-ink)]">Code has the final word:</strong> a
              deterministic checker, not the model, compares every draft against what you said. A
              draft it fails cannot be sent until you edit it or override it, and the override is
              logged.
            </li>
            <li>
              <strong className="text-[var(--color-ink)]">Secrets stay out of the prompt:</strong> a
              fact you withhold from someone is never handed to the model writing their message.
            </li>
            <li>
              <strong className="text-[var(--color-ink)]">You send, not SayOnce:</strong> messages
              open in WhatsApp or your mail app through official links. Nothing is sent on your
              behalf.
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
