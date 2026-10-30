"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/Badge";
import { useAutoGrow } from "@/lib/use-auto-grow";
import type { Contact, Channel, Formality, ParsedContact } from "@/lib/types";

const INITIAL_FORM: Omit<Contact, "id" | "profileVersion" | "archived" | "learnedRules"> & { id?: string } = {
  name: "",
  role: "",
  relationship: "",
  language: "Hinglish, Roman script",
  channel: "whatsapp",
  phone: "",
  email: "",
  formality: "neutral",
  caresAbout: "",
  neverTell: [],
};

export default function PeoplePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dataset, setDataset] = useState("real");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voice dictation entry
  const [dictatedText, setDictatedText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [unclearFields, setUnclearFields] = useState<string[]>([]);

  // Drawer & Form state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [neverTellInput, setNeverTellInput] = useState("");

  // Text boxes grow to fit; nothing is hidden behind a scrollbar in a box.
  const voiceRef = useRef<HTMLTextAreaElement>(null);
  const caresRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(voiceRef, dictatedText, 96);
  useAutoGrow(caresRef, formData.caresAbout, 64);
  const [saving, setSaving] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Whether the roster came from saved contacts or the bundled starter set.
  const [source, setSource] = useState<"stored" | "bundled">("stored");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts?dataset=${dataset}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load contacts");
      setContacts(data.contacts ?? []);
      setSource(data.source === "bundled" ? "bundled" : "stored");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [dataset]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Focus trap and Escape listener for drawer
  useEffect(() => {
    if (!selectedContact && !isEditing) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDrawer();
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedContact, isEditing]);

  function closeDrawer() {
    setSelectedContact(null);
    setIsEditing(false);
    triggerRef.current?.focus();
  }

  async function handleVoiceParse() {
    if (!dictatedText.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: dictatedText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to parse contact");

      const p: ParsedContact = data.parsed;
      setFormData({
        name: p.name ?? "",
        role: p.role ?? "",
        relationship: p.relationship ?? "",
        language: p.language ?? "Hinglish, Roman script",
        channel: p.channel ?? "whatsapp",
        phone: p.phone ?? "",
        email: p.email ?? "",
        formality: p.formality ?? "neutral",
        caresAbout: p.caresAbout ?? "",
        neverTell: p.neverTell ?? [],
      });
      setNeverTellInput((p.neverTell ?? []).join("; "));
      setUnclearFields(p.unclearFields ?? []);
      setIsEditing(true);
      setSelectedContact(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse contact speech");
    } finally {
      setParsing(false);
    }
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (formData.channel === "whatsapp" && (!formData.phone || !/^\+[1-9]\d{6,14}$/.test(formData.phone))) {
      setError("A valid E.164 phone number (e.g. +919000000099) is required for WhatsApp.");
      setSaving(false);
      return;
    }

    if (formData.channel === "email" && (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))) {
      setError("A valid email address is required for Email.");
      setSaving(false);
      return;
    }

    const parsedNeverTell = neverTellInput
      .split(/[;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dataset,
          contact: {
            ...formData,
            phone: formData.phone || null,
            email: formData.email || null,
            neverTell: parsedNeverTell,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save contact");

      closeDrawer();
      setFormData(INITIAL_FORM);
      setNeverTellInput("");
      setDictatedText("");
      setUnclearFields([]);
      await fetchContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this contact? Past messages will still reference them.")) return;
    try {
      const res = await fetch(`/api/contacts/${id}/archive`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive");
      closeDrawer();
      await fetchContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive contact");
    }
  }

  function handleStartEdit(contact: Contact) {
    setFormData({
      id: contact.id,
      name: contact.name,
      role: contact.role,
      relationship: contact.relationship,
      language: contact.language,
      channel: contact.channel,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      formality: contact.formality,
      caresAbout: contact.caresAbout,
      neverTell: contact.neverTell,
    });
    setNeverTellInput(contact.neverTell.join("; "));
    setUnclearFields([]);
    setIsEditing(true);
  }

  function handleRowClick(contact: Contact, el: HTMLElement) {
    triggerRef.current = el;
    setSelectedContact(contact);
    setIsEditing(false);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1
          className="font-display text-3xl font-semibold tracking-tight text-[var(--color-ink)]"
        >
          People Roster
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Recipient profiles, custom language dialects, strict channels, and Privacy Shield boundaries.
        </p>
      </div>

      {/* Voice Contact Entry: distinct dashed accent border */}
      <section className="rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-surface-raised)]/40 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="voice-entry" className="block text-sm font-semibold tracking-tight text-[var(--color-ink)]">
            Dictate a whole contact
          </label>
          <span className="font-mono text-[11px] text-[var(--color-accent)] font-semibold uppercase tracking-wider">
            Wispr Voice Ready
          </span>
        </div>
        <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
          Hold your Wispr key and speak a person’s complete profile. AI extracts all fields and flags any unclear details for review.
        </p>

        <textarea
          id="voice-entry"
          ref={voiceRef}
          value={dictatedText}
          onChange={(e) => setDictatedText(e.target.value)}
          placeholder='e.g. "Ramesh, our packaging vendor, speaks Hinglish, WhatsApp, plus 91 90 double zero double zero double zero nine nine, only cares about quantities and dates, never tell him about pricing."'
          rows={3}
          className="mt-1 w-full resize-none overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-sm leading-relaxed text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25"
        />

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleVoiceParse}
            disabled={parsing || !dictatedText.trim()}
            className="min-h-11 inline-flex items-center justify-center rounded bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-on-accent)] shadow-sm hover:opacity-90 active-press transition disabled:opacity-60"
          >
            {parsing ? "Parsing speech…" : "Fill profile from speech"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData(INITIAL_FORM);
              setNeverTellInput("");
              setUnclearFields([]);
              setIsEditing(true);
              setSelectedContact(null);
            }}
            className="min-h-11 inline-flex items-center justify-center rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)] active-press transition"
          >
            Add contact manually
          </button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-3 text-sm text-[var(--color-ink)] animate-fade-in">
          {error}
        </p>
      )}

      {/* Roster Controls & Directory */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dataset" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)] font-mono">
              Roster:
            </label>
            <select
              id="dataset"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-sm text-[var(--color-ink)]"
            >
              <option value="real">My Working Contacts (real)</option>
              <option value="india">Demo: Indian Team</option>
              <option value="global">Demo: Global Team</option>
            </select>
          </div>

          <span className="font-mono text-xs text-[var(--color-ink-soft)]">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          </span>
        </div>

        {!loading && dataset === "real" && source === "bundled" && contacts.length > 0 && (
          <p className="text-xs text-[var(--color-ink-soft)]">
            Starter roster: these are the people a fan-out writes to until you save contacts of
            your own.
          </p>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm font-mono text-[var(--color-ink-soft)]">
            Loading roster…
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-rule)] bg-[var(--color-surface-raised)]/40 p-12 text-center space-y-3">
            <p
              className="font-display text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              No contacts in this roster yet.
            </p>
            <p className="text-xs text-[var(--color-ink-soft)] max-w-sm mx-auto leading-relaxed">
              Use the voice box above to speak your first contact, or add one manually.
            </p>
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] overflow-hidden shadow-sm">
            <ul role="list" className="divide-y divide-[var(--color-rule)]">
              {contacts.map((contact) => {
                const initial = (contact.name || "?")[0]?.toUpperCase();
                return (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={(e) => handleRowClick(contact, e.currentTarget)}
                      className="w-full min-h-[52px] text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-raised)]/60 active-press transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-accent-wash)] text-[var(--color-accent)] font-semibold text-xs flex items-center justify-center font-mono flex-shrink-0 border border-[var(--color-accent)]/20">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="font-display text-base font-semibold tracking-tight text-[var(--color-ink)] truncate"
                          >
                            {contact.name}
                          </h3>
                          <p className="text-xs text-[var(--color-ink-soft)] truncate">
                            {contact.role} {contact.relationship ? `· ${contact.relationship}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="hidden sm:flex items-center gap-1.5">
                          <Badge tone="neutral">{contact.language}</Badge>
                          <Badge tone="neutral">
                            {contact.channel === "whatsapp" ? "WhatsApp" : "Email"}
                          </Badge>
                          <Badge tone="neutral">{contact.formality}</Badge>
                        </div>
                        <span className="text-xs text-[var(--color-ink-faint)] font-mono">→</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Right Drawer with .animate-slide-in-right over backdrop-blur-md veil */}
      {(selectedContact !== null || isEditing) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop veil */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity animate-fade-in"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Drawer surface */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            tabIndex={-1}
            className="animate-slide-in-right relative z-10 w-full max-w-lg bg-[var(--color-paper)] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-[var(--color-rule)]"
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent-wash)] text-[var(--color-accent)] font-semibold text-sm flex items-center justify-center font-mono border border-[var(--color-accent)]/20">
                    {(isEditing ? formData.name || "?" : selectedContact?.name || "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2
                      id="drawer-title"
                      className="font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)]"
                    >
                      {isEditing
                        ? formData.id
                          ? "Edit Contact"
                          : "New Contact"
                        : selectedContact?.name}
                    </h2>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {isEditing ? "Profile details" : selectedContact?.role}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sunk)] active-press transition"
                  aria-label="Close drawer"
                >
                  ✕
                </button>
              </div>

              {/* View Mode: Contact Details */}
              {!isEditing && selectedContact && (
                <div className="mt-6 space-y-6 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="neutral">{selectedContact.language}</Badge>
                    <Badge tone="neutral">
                      {selectedContact.channel === "whatsapp" ? "WhatsApp" : "Email"}
                    </Badge>
                    <Badge tone="neutral">{selectedContact.formality}</Badge>
                    {selectedContact.relationship && (
                      <Badge tone="neutral">{selectedContact.relationship}</Badge>
                    )}
                  </div>

                  <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-surface-raised)]/60 p-4">
                    {selectedContact.phone && (
                      <div>
                        <span className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
                          Phone (wa.me)
                        </span>
                        <p className="font-mono text-sm text-[var(--color-ink)] mt-0.5">
                          {selectedContact.phone}
                        </p>
                      </div>
                    )}
                    {selectedContact.email && (
                      <div>
                        <span className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
                          Email (mailto)
                        </span>
                        <p className="font-mono text-sm text-[var(--color-ink)] mt-0.5">
                          {selectedContact.email}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedContact.caresAbout && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
                        Priorities (Cares About)
                      </h4>
                      <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed">
                        {selectedContact.caresAbout}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
                      Privacy Shield (Never Tell Topics)
                    </h4>
                    {selectedContact.neverTell.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedContact.neverTell.map((topic, i) => (
                          <Badge key={i} tone="locked">
                            🔒 {topic}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--color-ink-faint)] italic">
                        No standing restrictions set.
                      </p>
                    )}
                  </div>

                  {selectedContact.learnedRules && selectedContact.learnedRules.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider font-mono">
                        Learned Rules (Phase 5 Memory)
                      </h4>
                      <ul className="mt-2 list-disc pl-5 text-xs text-[var(--color-ink-soft)] space-y-1">
                        {selectedContact.learnedRules.map((rule, i) => (
                          <li key={i}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Edit / New Mode: Contact Form */}
              {isEditing && (
                <form id="contact-form" onSubmit={handleSaveContact} className="mt-6 space-y-4 text-xs sm:text-sm">
                  {unclearFields.length > 0 && (
                    <div className="rounded-[var(--radius-card)] border border-[var(--color-warning)] bg-[var(--color-warning-wash)] p-3 text-xs text-[var(--color-ink)]">
                      <span className="font-semibold text-[var(--color-warning)]">Review flagged fields: </span>
                      {unclearFields.join(", ")} were unclear or omitted from dictation. Please verify them.
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-ink)]">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--color-ink)]">Role *</label>
                      <input
                        type="text"
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="e.g. Packaging vendor, Team lead"
                        className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--color-ink)]">Relationship</label>
                      <input
                        type="text"
                        value={formData.relationship}
                        onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                        placeholder="e.g. supplier, client, core team"
                        className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--color-ink)]">Language &amp; Script *</label>
                      <input
                        type="text"
                        required
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        placeholder="e.g. Hinglish, Roman script or Hindi, Devanagari"
                        className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm outline-none"
                      />
                    </div>

                    {/* One column on a phone: side by side in the drawer the
                        channel picker cut off "WhatsApp (wa.me)". */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-ink)]">Channel *</label>
                        <select
                          value={formData.channel}
                          onChange={(e) => setFormData({ ...formData, channel: e.target.value as Channel })}
                          className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm outline-none"
                        >
                          <option value="whatsapp">WhatsApp (wa.me)</option>
                          <option value="email">Email (mailto:)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[var(--color-ink)]">Formality</label>
                        <select
                          value={formData.formality}
                          onChange={(e) => setFormData({ ...formData, formality: e.target.value as Formality })}
                          className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm outline-none"
                        >
                          <option value="formal">Formal</option>
                          <option value="neutral">Neutral</option>
                          <option value="casual">Casual</option>
                        </select>
                      </div>
                    </div>

                    <div className={unclearFields.includes("phone") ? "rounded border border-[var(--color-warning)] p-1.5" : ""}>
                      <label className="block text-xs font-medium text-[var(--color-ink)]">
                        Phone (E.164) {formData.channel === "whatsapp" && <span className="text-[var(--color-accent)] font-semibold">* Required for WhatsApp</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.phone ?? ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+919000000099"
                        className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm font-mono outline-none"
                      />
                    </div>

                    <div className={unclearFields.includes("email") ? "rounded border border-[var(--color-warning)] p-1.5" : ""}>
                      <label className="block text-xs font-medium text-[var(--color-ink)]">
                        Email {formData.channel === "email" && <span className="text-[var(--color-accent)] font-semibold">* Required for Email</span>}
                      </label>
                      <input
                        type="email"
                        value={formData.email ?? ""}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@sayonce.example"
                        className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--color-ink)]">Priorities (Cares About)</label>
                      <textarea
                        ref={caresRef}
                        value={formData.caresAbout}
                        onChange={(e) => setFormData({ ...formData, caresAbout: e.target.value })}
                        rows={2}
                        placeholder="e.g. Quantities, arrival dates, shipment counts. No operational gossip."
                        className="mt-1 w-full resize-none overflow-hidden rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] p-2.5 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--color-ink)]">
                        Privacy Shield (Never Tell Topics) <span className="text-[var(--color-ink-faint)]">— separate with semicolons</span>
                      </label>
                      <input
                        type="text"
                        value={neverTellInput}
                        onChange={(e) => setNeverTellInput(e.target.value)}
                        placeholder="pricing; vendor cost; internal margin"
                        className="mt-1 w-full min-h-11 rounded border border-[var(--color-rule)] bg-[var(--color-surface-raised)] px-3 text-sm outline-none"
                      />
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="border-t border-[var(--color-rule)] pt-4 mt-8 flex flex-wrap items-center justify-between gap-3">
              {!isEditing && selectedContact && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(selectedContact)}
                    className="min-h-11 inline-flex items-center justify-center rounded bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-on-accent)] shadow-sm hover:opacity-90 active-press transition"
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(selectedContact.id)}
                    className="min-h-11 inline-flex items-center justify-center rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-blocked)] hover:bg-[var(--color-blocked-wash)] active-press transition"
                  >
                    Archive contact
                  </button>
                </>
              )}

              {isEditing && (
                <>
                  <button
                    type="submit"
                    form="contact-form"
                    disabled={saving}
                    className="min-h-11 inline-flex items-center justify-center rounded bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-on-accent)] shadow-sm hover:opacity-90 active-press transition disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save Contact"}
                  </button>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="min-h-11 inline-flex items-center justify-center rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-sunk)] active-press transition"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
