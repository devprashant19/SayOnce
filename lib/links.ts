import type { Draft } from "./types";

/**
 * Send links. SayOnce never touches a messaging API.
 *
 * wa.me and mailto: are official, free, need no account, and cannot get a
 * WhatsApp number restricted the way an unofficial library can. They are also
 * the reason the whole app works from a public link with no login.
 */

/** wa.me wants digits only — no plus, no spaces, no dashes. */
export function whatsappDigits(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new Error(`Not a usable international number: ${phoneE164}`);
  }
  return digits;
}

export function whatsappLink(phoneE164: string, body: string): string {
  return `https://wa.me/${whatsappDigits(phoneE164)}?text=${encodeURIComponent(body)}`;
}

/**
 * mailto: bodies need CRLF line breaks. encodeURIComponent leaves \n as %0A,
 * which several desktop mail clients collapse, so normalise first.
 */
export function mailtoLink(email: string, subject: string, body: string): string {
  const normalised = body.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", normalised);
  // URLSearchParams encodes spaces as "+", which mail clients render literally.
  return `mailto:${encodeURIComponent(email)}?${params.toString().replace(/\+/g, "%20")}`;
}

export interface SendTarget {
  kind: "whatsapp" | "email" | "copy";
  href: string | null;
  label: string;
  /** Set when the draft cannot be sent as-is, e.g. a vendor with no phone. */
  blockedReason: string | null;
}

export function sendTargetFor(
  draft: Draft,
  contact: { name: string; phone: string | null; email: string | null },
): SendTarget {
  if (draft.channel === "whatsapp") {
    if (!contact.phone) {
      return {
        kind: "whatsapp",
        href: null,
        label: `Open in WhatsApp`,
        blockedReason: `${contact.name} has no phone number yet. Add one in the People Book.`,
      };
    }
    return {
      kind: "whatsapp",
      href: whatsappLink(contact.phone, draft.body),
      label: "Open in WhatsApp",
      blockedReason: null,
    };
  }

  if (!contact.email) {
    return {
      kind: "email",
      href: null,
      label: "Open in Email",
      blockedReason: `${contact.name} has no email address yet. Add one in the People Book.`,
    };
  }
  return {
    kind: "email",
    href: mailtoLink(contact.email, draft.subject ?? "", draft.body),
    label: "Open in Email",
    blockedReason: null,
  };
}

/**
 * Round-trip check used by the Phase 3 send-test page: decode the link we
 * built and confirm it still holds the exact bytes we put in.
 */
export function decodeSendLink(href: string): { to: string; subject: string | null; body: string } {
  const url = new URL(href);
  if (url.protocol === "mailto:") {
    const [to, query = ""] = url.pathname.length > 0
      ? [decodeURIComponent(url.pathname), url.search.replace(/^\?/, "")]
      : [decodeURIComponent(url.href.slice("mailto:".length).split("?")[0] ?? ""), url.search.replace(/^\?/, "")];
    const params = new URLSearchParams(query);
    return {
      to,
      subject: params.get("subject"),
      body: (params.get("body") ?? "").replace(/\r\n/g, "\n"),
    };
  }
  return {
    to: url.pathname.replace(/^\//, ""),
    subject: null,
    body: url.searchParams.get("text") ?? "",
  };
}
