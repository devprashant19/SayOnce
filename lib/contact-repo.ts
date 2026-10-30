import "server-only";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { eq, and, isNull } from "drizzle-orm";
import { db, schema, REAL_DATASET } from "./db";
import { env } from "./env";
import { Contact, type Channel, type Formality } from "./types";
import { loadContactSet } from "./contact-sets";

const STORE_DIR = join(process.cwd(), "data", "store");
const STORE_PATH = join(STORE_DIR, "contacts.json");

interface StoredContactRow {
  id: string;
  dataset: string;
  name: string;
  role: string;
  relationship: string;
  language: string;
  channel: Channel;
  phone: string | null;
  email: string | null;
  formality: Formality;
  caresAbout: string;
  neverTell: string[];
  learnedRules?: string[];
  profileVersion?: number;
  archivedAt: string | null;
}

function ensureLocalStore(): StoredContactRow[] {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
  if (!existsSync(STORE_PATH)) {
    // Seed initial contacts from fixtures
    const initial: StoredContactRow[] = [];
    const sets = ["freelance", "india", "global"];
    for (const setName of sets) {
      try {
        const loaded = loadContactSet(setName);
        const dataset = setName === "freelance" ? REAL_DATASET : setName;
        for (const c of loaded) {
          initial.push({
            id: c.id,
            dataset,
            name: c.name,
            role: c.role,
            relationship: c.relationship ?? "",
            language: c.language,
            channel: c.channel,
            phone: c.phone ?? null,
            email: c.email ?? null,
            formality: c.formality,
            caresAbout: c.caresAbout ?? "",
            neverTell: c.neverTell ?? [],
            learnedRules: [],
            profileVersion: 1,
            archivedAt: null,
          });
        }
      } catch {
        // ignore if fixture missing
      }
    }
    writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as StoredContactRow[];
  } catch {
    return [];
  }
}

function writeLocalStore(rows: StoredContactRow[]) {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
  writeFileSync(STORE_PATH, JSON.stringify(rows, null, 2), "utf8");
}

export async function listContacts(dataset = REAL_DATASET): Promise<Contact[]> {
  if (env.hasDatabase) {
    try {
      const rows = await db()
        .select()
        .from(schema.contacts)
        .where(and(eq(schema.contacts.dataset, dataset), isNull(schema.contacts.archivedAt)));

      return rows.map((r) =>
        Contact.parse({
          id: r.id,
          name: r.name,
          role: r.role,
          relationship: r.relationship,
          language: r.language,
          channel: r.channel as Channel,
          phone: r.phone,
          email: r.email,
          formality: r.formality as Formality,
          caresAbout: r.caresAbout,
          neverTell: r.neverTell,
        }),
      );
    } catch (err) {
      // On a serverless host the local store is a read-only, throwaway disk;
      // falling back there crashed on mkdir and sent that error to the page.
      if (process.env.VERCEL) throw err;
      console.warn("DB query failed, falling back to local store:", err);
    }
  }

  const rows = ensureLocalStore();
  return rows
    .filter((r) => r.dataset === dataset && !r.archivedAt)
    .map((r) =>
      Contact.parse({
        id: r.id,
        name: r.name,
        role: r.role,
        relationship: r.relationship,
        language: r.language,
        channel: r.channel,
        phone: r.phone,
        email: r.email,
        formality: r.formality,
        caresAbout: r.caresAbout,
        neverTell: r.neverTell,
      }),
    );
}

export async function getContact(id: string): Promise<Contact | null> {
  if (env.hasDatabase) {
    try {
      const rows = await db()
        .select()
        .from(schema.contacts)
        .where(and(eq(schema.contacts.id, id), isNull(schema.contacts.archivedAt)));
      if (rows.length > 0) {
        const r = rows[0]!;
        const c = Contact.parse({
          id: r.id,
          name: r.name,
          role: r.role,
          relationship: r.relationship,
          language: r.language,
          channel: r.channel,
          phone: r.phone,
          email: r.email,
          formality: r.formality,
          caresAbout: r.caresAbout,
          neverTell: r.neverTell,
          profileVersion: r.profileVersion ?? 1,
          learnedRules: [],
        });
        return c;
      }
    } catch {
      // fallback
    }
  }

  const rows = ensureLocalStore();
  const r = rows.find((row) => row.id === id && !row.archivedAt);
  if (!r) return null;
  const c = Contact.parse({
    id: r.id,
    name: r.name,
    role: r.role,
    relationship: r.relationship,
    language: r.language,
    channel: r.channel,
    phone: r.phone,
    email: r.email,
    formality: r.formality,
    caresAbout: r.caresAbout,
    neverTell: r.neverTell,
    learnedRules: r.learnedRules ?? [],
    profileVersion: r.profileVersion ?? 1,
  });
  return c;
}

export async function saveContact(
  contact: Omit<Contact, "id"> & { id?: string; profileVersion?: number; learnedRules?: string[] },
  dataset = REAL_DATASET,
): Promise<Contact> {
  const id = contact.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const fullContact = Contact.parse({
    id,
    name: contact.name,
    role: contact.role,
    relationship: contact.relationship ?? "",
    language: contact.language,
    channel: contact.channel,
    phone: contact.phone ?? null,
    email: contact.email ?? null,
    formality: contact.formality ?? "neutral",
    caresAbout: contact.caresAbout ?? "",
    neverTell: contact.neverTell ?? [],
  });

  const nextVersion = (contact.profileVersion ?? 0) + 1;
  const learnedRules = contact.learnedRules ?? [];

  if (env.hasDatabase) {
    try {
      await db()
        .insert(schema.contacts)
        .values({
          id: fullContact.id,
          dataset,
          name: fullContact.name,
          role: fullContact.role,
          relationship: fullContact.relationship,
          language: fullContact.language,
          channel: fullContact.channel,
          phone: fullContact.phone,
          email: fullContact.email,
          formality: fullContact.formality,
          caresAbout: fullContact.caresAbout,
          neverTell: fullContact.neverTell,
          learnedRules,
          profileVersion: nextVersion,
          archivedAt: null,
        })
        .onConflictDoUpdate({
          target: schema.contacts.id,
          set: {
            name: fullContact.name,
            role: fullContact.role,
            relationship: fullContact.relationship,
            language: fullContact.language,
            channel: fullContact.channel,
            phone: fullContact.phone,
            email: fullContact.email,
            formality: fullContact.formality,
            caresAbout: fullContact.caresAbout,
            neverTell: fullContact.neverTell,
            profileVersion: nextVersion,
            archivedAt: null,
          },
        });
      return fullContact;
    } catch (err) {
      console.warn("DB insert failed, falling back to local store:", err);
    }
  }

  const rows = ensureLocalStore();
  const existingIdx = rows.findIndex((r) => r.id === id);
  const row: StoredContactRow = {
    id: fullContact.id,
    dataset,
    name: fullContact.name,
    role: fullContact.role,
    relationship: fullContact.relationship,
    language: fullContact.language,
    channel: fullContact.channel,
    phone: fullContact.phone,
    email: fullContact.email,
    formality: fullContact.formality,
    caresAbout: fullContact.caresAbout,
    neverTell: fullContact.neverTell,
    learnedRules,
    profileVersion: nextVersion,
    archivedAt: null,
  };

  if (existingIdx >= 0) {
    rows[existingIdx] = row;
  } else {
    rows.push(row);
  }
  writeLocalStore(rows);
  return fullContact;
}

export async function archiveContact(id: string): Promise<void> {
  if (env.hasDatabase) {
    try {
      await db()
        .update(schema.contacts)
        .set({ archivedAt: new Date() })
        .where(eq(schema.contacts.id, id));
      return;
    } catch (err) {
      console.warn("DB update failed, falling back to local store:", err);
    }
  }

  const rows = ensureLocalStore();
  const row = rows.find((r) => r.id === id);
  if (row) {
    row.archivedAt = new Date().toISOString();
    writeLocalStore(rows);
  }
}

export async function updateContactProfile(
  id: string,
  updates: {
    formality?: Formality;
    learnedRulesToAdd?: string[];
  },
): Promise<{ contact: Contact; profileVersion: number }> {
  const current = await getContact(id);
  const currentLearned = current?.learnedRules ?? [];
  const nextRules = [...currentLearned];

  for (const rule of updates.learnedRulesToAdd ?? []) {
    if (!nextRules.includes(rule.trim())) {
      nextRules.push(rule.trim());
    }
  }

  const nextFormality = updates.formality ?? current?.formality ?? "neutral";
  const currentVersion = current?.profileVersion ?? 1;
  const nextVersion = currentVersion + 1;

  if (env.hasDatabase && current) {
    try {
      await db()
        .update(schema.contacts)
        .set({
          formality: nextFormality,
          profileVersion: nextVersion,
        })
        .where(eq(schema.contacts.id, id));
    } catch (err) {
      console.warn("DB updateContactProfile failed:", err);
    }
  }

  const rows = ensureLocalStore();
  const existingIdx = rows.findIndex((r) => r.id === id);
  if (existingIdx >= 0) {
    rows[existingIdx] = {
      ...rows[existingIdx]!,
      formality: nextFormality,
      learnedRules: nextRules,
      profileVersion: nextVersion,
    };
    writeLocalStore(rows);
  }

  const updatedContact: Contact = {
    ...(current ?? {
      id,
      name: id,
      role: "",
      relationship: "",
      language: "English",
      channel: "email" as Channel,
      phone: null,
      email: null,
      caresAbout: "",
      neverTell: [],
    }),
    formality: nextFormality,
    learnedRules: nextRules,
    profileVersion: nextVersion,
  };

  return { contact: updatedContact, profileVersion: nextVersion };
}
