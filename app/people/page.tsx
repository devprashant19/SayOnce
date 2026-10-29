"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/Badge";
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

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [neverTellInput, setNeverTellInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts?dataset=${dataset}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load contacts");
      setContacts(data.contacts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [dataset]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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
        language: p.language ?? "English",
        channel: p.channel ?? "whatsapp",
        phone: p.phone ?? "",
        email: p.email ?? "",
        formality: p.formality ?? "neutral",
        caresAbout: p.caresAbout ?? "",
        neverTell: p.neverTell ?? [],
      });
      setNeverTellInput((p.neverTell ?? []).join("; "));
      setUnclearFields(p.unclearFields ?? []);
      setShowForm(true);
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

    // Validate phone for whatsapp, email for email
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

      setShowForm(false);
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
      await fetchContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive contact");
    }
  }

  function handleEdit(contact: Contact) {
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
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People Book</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Who hears what. Free-text languages, strict channel routing, and standing privacy rules.
        </p>
      </div>

      {/* Voice Contact Entry */}
      <section className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 sm:p-5">
        <label htmlFor="voice-entry" className="block text-sm font-semibold">
          Voice Contact Entry
        </label>
        <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
          Dictate a person’s details through Wispr Flow. AI fills the fields; unclear items are flagged for you.
        </p>

        <textarea
          id="voice-entry"
          value={dictatedText}
          onChange={(e) => setDictatedText(e.target.value)}
          placeholder='e.g. "Ramesh, our packaging vendor, speaks Hinglish, WhatsApp, plus 91 90 double zero double zero double zero nine nine, only cares about quantities and dates, never tell him about pricing."'
          rows={3}
          className="mt-3 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-3 text-sm leading-relaxed outline-none"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleVoiceParse}
            disabled={parsing || !dictatedText.trim()}
            className="rounded bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {parsing ? "Parsing dictation…" : "Fill form from speech"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData(INITIAL_FORM);
              setNeverTellInput("");
              setUnclearFields([]);
              setShowForm(true);
            }}
            className="rounded border border-[var(--color-rule)] px-4 py-2 text-xs font-medium hover:bg-[var(--color-paper-sunk)]"
          >
            Add manually
          </button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-3 text-sm">
          {error}
        </p>
      )}

      {/* Contact Form Modal / Drawer */}
      {showForm && (
        <section className="rounded-[var(--radius-card)] border-2 border-[var(--color-accent)]/50 bg-[var(--color-paper)] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
            <h2 className="text-lg font-semibold">
              {formData.id ? "Edit Contact" : "New Contact"}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            >
              Cancel
            </button>
          </div>

          {unclearFields.length > 0 && (
            <div className="rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-wash)] p-3 text-xs">
              <span className="font-semibold">Review flagged fields: </span>
              {unclearFields.join(", ")} were not supplied in dictation. Please verify them.
            </div>
          )}

          <form onSubmit={handleSaveContact} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Role *</label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Packaging vendor, UI designer"
                  className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Relationship</label>
                <input
                  type="text"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  placeholder="e.g. supplier, freelance colleague"
                  className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium">
                  Language & Script * <span className="text-[var(--color-ink-faint)]">(free text)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  placeholder="e.g. Hinglish, Roman script or Hindi, Devanagari"
                  className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Channel *</label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value as Channel })}
                  className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none"
                >
                  <option value="whatsapp">WhatsApp (wa.me)</option>
                  <option value="email">Email (mailto:)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">Formality</label>
                <select
                  value={formData.formality}
                  onChange={(e) => setFormData({ ...formData, formality: e.target.value as Formality })}
                  className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none"
                >
                  <option value="formal">Formal</option>
                  <option value="neutral">Neutral</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <div className={unclearFields.includes("phone") ? "rounded p-1 border border-[var(--color-warning)]" : ""}>
                <label className="block text-xs font-medium">
                  Phone (E.164) {formData.channel === "whatsapp" && <span className="text-[var(--color-accent)] font-semibold">* Required for WhatsApp</span>}
                </label>
                <input
                  type="text"
                  value={formData.phone ?? ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+919000000099"
                  className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none font-mono"
                />
              </div>

              <div className={unclearFields.includes("email") ? "rounded p-1 border border-[var(--color-warning)]" : ""}>
                <label className="block text-xs font-medium">
                  Email {formData.channel === "email" && <span className="text-[var(--color-accent)] font-semibold">* Required for Email</span>}
                </label>
                <input
                  type="email"
                  value={formData.email ?? ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ramesh@sayonce.example"
                  className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium">Cares About (Priorities)</label>
              <textarea
                value={formData.caresAbout}
                onChange={(e) => setFormData({ ...formData, caresAbout: e.target.value })}
                rows={2}
                placeholder="e.g. Quantities, arrival dates, shipment counts. No operational gossip."
                className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium">
                Never Tell (Privacy Shield Topics) <span className="text-[var(--color-ink-faint)]">— separate with semicolons</span>
              </label>
              <input
                type="text"
                value={neverTellInput}
                onChange={(e) => setNeverTellInput(e.target.value)}
                placeholder="pricing; vendor cost; internal margin"
                className="mt-1 w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-[var(--color-accent)] px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Contact"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded border border-[var(--color-rule)] px-4 py-2 text-xs hover:bg-[var(--color-paper-sunk)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Dataset filter */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dataset" className="text-sm font-medium">
              Roster:
            </label>
            <select
              id="dataset"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1.5 text-sm"
            >
              <option value="real">My Working Contacts (real)</option>
              <option value="india">Demo: Indian Team</option>
              <option value="global">Demo: Global Team</option>
            </select>
          </div>

          <span className="text-xs text-[var(--color-ink-soft)]">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--color-ink-soft)]">Loading contacts…</div>
        ) : contacts.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-rule)] p-8 text-center text-sm text-[var(--color-ink-soft)]">
            No contacts in this roster. Dictate or add one above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <article
                key={contact.id}
                className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-base">{contact.name}</h3>
                      <p className="text-xs text-[var(--color-ink-soft)]">
                        {contact.role} {contact.relationship ? `(${contact.relationship})` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone="neutral">{contact.channel}</Badge>
                      <Badge tone="neutral">{contact.formality}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <p>
                      <span className="text-[var(--color-ink-soft)]">Language: </span>
                      <span className="font-medium">{contact.language}</span>
                    </p>
                    {contact.phone && (
                      <p>
                        <span className="text-[var(--color-ink-soft)]">Phone: </span>
                        <span className="font-mono">{contact.phone}</span>
                      </p>
                    )}
                    {contact.email && (
                      <p>
                        <span className="text-[var(--color-ink-soft)]">Email: </span>
                        <span>{contact.email}</span>
                      </p>
                    )}
                    {contact.caresAbout && (
                      <p className="text-[var(--color-ink-soft)] line-clamp-2">
                        <span className="font-medium text-[var(--color-ink)]">Cares about: </span>
                        {contact.caresAbout}
                      </p>
                    )}
                    {contact.neverTell.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-[var(--color-blocked)] font-medium">Never tell:</span>
                        {contact.neverTell.map((topic, i) => (
                          <span
                            key={i}
                            className="rounded bg-[var(--color-blocked-wash)] px-1.5 py-0.5 text-[10px] text-[var(--color-blocked)] border border-[var(--color-blocked)]/30"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[var(--color-rule)] pt-3 mt-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(contact)}
                    className="text-xs font-medium text-[var(--color-ink)] hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-[var(--color-rule)]">·</span>
                  <button
                    type="button"
                    onClick={() => handleArchive(contact.id)}
                    className="text-xs font-medium text-[var(--color-blocked)] hover:underline"
                  >
                    Archive
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
