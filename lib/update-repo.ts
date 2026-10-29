import "server-only";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, schema, REAL_DATASET } from "./db";
import { env } from "./env";
import { appendEntry, verifyChain, type TrailEntry, type TrailVerdict } from "./trail";
import type { Fact, TrailEntryType } from "./types";

const STORE_DIR = join(process.cwd(), "data", "store");
const UPDATES_FILE = join(STORE_DIR, "updates.json");
const MESSAGES_FILE = join(STORE_DIR, "messages.json");
const FACTS_FILE = join(STORE_DIR, "facts.json");
const TRAIL_FILE = join(STORE_DIR, "trail.json");

function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string): T[] {
  ensureStoreDir();
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T[];
  } catch {
    return [];
  }
}

function writeJsonFile<T>(filePath: string, data: T[]) {
  ensureStoreDir();
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export interface StoredUpdate {
  id: string;
  dataset: string;
  createdAt: string;
  spokenOn: string;
  timeZone: string;
  project: string;
  rawText: string;
  summary: string;
  decisions: string[];
  elapsedSeconds: number | null;
}

export interface StoredMessage {
  id: string;
  updateId: string;
  contactId: string;
  channel: string;
  subject: string | null;
  body: string;
  usedFactIds: string[];
  sentences: Array<{ sentence: string; factIds: string[] }>;
  checkOk: boolean | null;
  checkFailures: unknown[];
  toneScore: number | null;
  verifyIssues: string[];
  overridden: boolean;
  sent: boolean;
  sentAt: string | null;
  editedByUser: boolean;
}

export interface StoredFact {
  id: string;
  updateId: string;
  text: string;
  type: string;
  values: { numbers: string[]; datesIso: string[]; names: string[] };
  sourceSpanStart: number;
  sourceSpanEnd: number;
  blockedFor: string[];
  blockedReason: string;
  commitmentOwner?: string | null;
  commitmentDue?: string | null;
  commitmentStatus?: string | null;
}

export interface SaveFanoutParams {
  updateId: string;
  dataset?: string;
  spokenOn: string;
  timeZone?: string;
  project?: string;
  rawText: string;
  summary: string;
  decisions: string[];
  elapsedSeconds?: number | null;
  facts: Fact[];
  messages: Array<{
    id: string;
    contactId: string;
    channel: string;
    subject: string | null;
    body: string;
    usedFactIds: string[];
    sentences: Array<{ sentence: string; factIds: string[] }>;
    checkOk: boolean | null;
    checkFailures: unknown[];
  }>;
  trail: TrailEntry[];
}

export async function saveFanoutRecord(params: SaveFanoutParams): Promise<void> {
  const dataset = params.dataset ?? REAL_DATASET;
  const timeZone = params.timeZone ?? "Asia/Kolkata";
  const project = params.project ?? "";
  const nowIso = new Date().toISOString();

  if (env.hasDatabase) {
    try {
      const database = db();
      await database.insert(schema.updates).values({
        id: params.updateId,
        dataset,
        spokenOn: params.spokenOn,
        timeZone,
        project,
        rawText: params.rawText,
        summary: params.summary,
        decisions: params.decisions,
        elapsedSeconds: params.elapsedSeconds ?? null,
      });

      if (params.facts.length > 0) {
        await database.insert(schema.facts).values(
          params.facts.map((f) => ({
            id: f.id,
            updateId: params.updateId,
            text: f.text,
            type: f.type,
            values: f.values,
            sourceSpanStart: f.sourceSpan.start,
            sourceSpanEnd: f.sourceSpan.end,
            blockedFor: f.privacy.blockedFor,
            blockedReason: f.privacy.reason,
            commitmentOwner: null,
            commitmentDue: null,
            commitmentStatus: null,
          })),
        );
      }

      if (params.messages.length > 0) {
        await database.insert(schema.messages).values(
          params.messages.map((m) => ({
            id: m.id,
            updateId: params.updateId,
            contactId: m.contactId,
            channel: m.channel,
            subject: m.subject,
            body: m.body,
            usedFactIds: m.usedFactIds,
            sentences: m.sentences,
            checkOk: m.checkOk,
            checkFailures: m.checkFailures,
            toneScore: null,
            verifyIssues: [],
            overridden: false,
            sent: false,
            sentAt: null,
            editedByUser: false,
          })),
        );
      }

      if (params.trail.length > 0) {
        await database.insert(schema.trailEntries).values(
          params.trail.map((t) => ({
            id: `${params.updateId}-${t.seq}`,
            updateId: params.updateId,
            seq: t.seq,
            at: new Date(t.at),
            actor: t.actor,
            type: t.type,
            payloadJson: t.payload,
            prevHash: t.prevHash,
            hash: t.hash,
          })),
        );
      }
      return;
    } catch (error) {
      console.warn("Database insert failed, using local store fallback:", error);
    }
  }

  // Local JSON store fallback
  const updatesList = readJsonFile<StoredUpdate>(UPDATES_FILE);
  updatesList.push({
    id: params.updateId,
    dataset,
    createdAt: nowIso,
    spokenOn: params.spokenOn,
    timeZone,
    project,
    rawText: params.rawText,
    summary: params.summary,
    decisions: params.decisions,
    elapsedSeconds: params.elapsedSeconds ?? null,
  });
  writeJsonFile(UPDATES_FILE, updatesList);

  const factsList = readJsonFile<StoredFact>(FACTS_FILE);
  for (const f of params.facts) {
    factsList.push({
      id: f.id,
      updateId: params.updateId,
      text: f.text,
      type: f.type,
      values: f.values,
      sourceSpanStart: f.sourceSpan.start,
      sourceSpanEnd: f.sourceSpan.end,
      blockedFor: f.privacy.blockedFor,
      blockedReason: f.privacy.reason,
      commitmentOwner: null,
      commitmentDue: null,
      commitmentStatus: null,
    });
  }
  writeJsonFile(FACTS_FILE, factsList);

  const messagesList = readJsonFile<StoredMessage>(MESSAGES_FILE);
  for (const m of params.messages) {
    messagesList.push({
      id: m.id,
      updateId: params.updateId,
      contactId: m.contactId,
      channel: m.channel,
      subject: m.subject,
      body: m.body,
      usedFactIds: m.usedFactIds,
      sentences: m.sentences,
      checkOk: m.checkOk,
      checkFailures: m.checkFailures,
      toneScore: null,
      verifyIssues: [],
      overridden: false,
      sent: false,
      sentAt: null,
      editedByUser: false,
    });
  }
  writeJsonFile(MESSAGES_FILE, messagesList);

  const trailList = readJsonFile<TrailEntry>(TRAIL_FILE);
  for (const t of params.trail) {
    trailList.push(t);
  }
  writeJsonFile(TRAIL_FILE, trailList);
}

export interface MarkSentResult {
  success: boolean;
  messageId: string;
  sent: boolean;
  sentAt: string | null;
  trailVerdict: TrailVerdict;
}

export async function markMessageSent(params: {
  messageId: string;
  updateId: string;
  contactId: string;
  channel: string;
  sent?: boolean;
}): Promise<MarkSentResult> {
  const isSent = params.sent ?? true;
  const sentAtIso = isSent ? new Date().toISOString() : null;

  if (env.hasDatabase) {
    try {
      const database = db();
      await database
        .update(schema.messages)
        .set({
          sent: isSent,
          sentAt: sentAtIso ? new Date(sentAtIso) : null,
        })
        .where(eq(schema.messages.id, params.messageId));

      if (isSent) {
        // Fetch existing trail entries to append hash-chained 'sent' entry
        const existingEntries = await database
          .select()
          .from(schema.trailEntries)
          .where(eq(schema.trailEntries.updateId, params.updateId))
          .orderBy(schema.trailEntries.seq);

        const lastEntry = existingEntries[existingEntries.length - 1];
        const prevHash = lastEntry?.hash ?? "0".repeat(64);
        const nextSeq = (lastEntry?.seq ?? 0) + 1;

        const sentEntry = appendEntry(
          {
            updateId: params.updateId,
            seq: nextSeq,
            at: sentAtIso!,
            actor: "user",
            type: "sent",
            payload: {
              messageId: params.messageId,
              contactId: params.contactId,
              channel: params.channel,
              sentAt: sentAtIso,
            },
          },
          prevHash,
        );

        await database.insert(schema.trailEntries).values({
          id: `${params.updateId}-${sentEntry.seq}`,
          updateId: params.updateId,
          seq: sentEntry.seq,
          at: new Date(sentEntry.at),
          actor: sentEntry.actor,
          type: sentEntry.type,
          payloadJson: sentEntry.payload,
          prevHash: sentEntry.prevHash,
          hash: sentEntry.hash,
        });

        const allEntries: TrailEntry[] = [
          ...existingEntries.map((e) => ({
            updateId: e.updateId,
            seq: e.seq,
            at: e.at.toISOString(),
            actor: e.actor as "user" | "ai" | "system",
            type: e.type as TrailEntryType,
            payload: e.payloadJson,
            prevHash: e.prevHash,
            hash: e.hash,
          })),
          sentEntry,
        ];

        return {
          success: true,
          messageId: params.messageId,
          sent: isSent,
          sentAt: sentAtIso,
          trailVerdict: verifyChain(allEntries),
        };
      }

      return {
        success: true,
        messageId: params.messageId,
        sent: isSent,
        sentAt: sentAtIso,
        trailVerdict: { ok: true, length: 0 },
      };
    } catch (error) {
      console.warn("Database markMessageSent failed, using local store:", error);
    }
  }

  // Local JSON store
  const messagesList = readJsonFile<StoredMessage>(MESSAGES_FILE);
  const msgIdx = messagesList.findIndex((m) => m.id === params.messageId);
  if (msgIdx !== -1) {
    messagesList[msgIdx]!.sent = isSent;
    messagesList[msgIdx]!.sentAt = sentAtIso;
    writeJsonFile(MESSAGES_FILE, messagesList);
  }

  const trailList = readJsonFile<TrailEntry>(TRAIL_FILE);
  const updateTrail = trailList.filter((t) => t.updateId === params.updateId);

  if (isSent) {
    const lastEntry = updateTrail[updateTrail.length - 1];
    const prevHash = lastEntry?.hash ?? "0".repeat(64);
    const nextSeq = (lastEntry?.seq ?? 0) + 1;

    const sentEntry = appendEntry(
      {
        updateId: params.updateId,
        seq: nextSeq,
        at: sentAtIso!,
        actor: "user",
        type: "sent",
        payload: {
          messageId: params.messageId,
          contactId: params.contactId,
          channel: params.channel,
          sentAt: sentAtIso,
        },
      },
      prevHash,
    );

    trailList.push(sentEntry);
    writeJsonFile(TRAIL_FILE, trailList);
    updateTrail.push(sentEntry);
  }

  return {
    success: true,
    messageId: params.messageId,
    sent: isSent,
    sentAt: sentAtIso,
    trailVerdict: verifyChain(updateTrail),
  };
}

export async function overrideMessage(params: {
  messageId: string;
  updateId: string;
  contactId: string;
  reason?: string;
}): Promise<{ success: boolean; messageId: string; overridden: boolean; trailVerdict: TrailVerdict }> {
  const atIso = new Date().toISOString();
  const reason = params.reason ?? "Speaker override";

  if (env.hasDatabase) {
    try {
      const database = db();
      await database
        .update(schema.messages)
        .set({ overridden: true })
        .where(eq(schema.messages.id, params.messageId));

      const existingEntries = await database
        .select()
        .from(schema.trailEntries)
        .where(eq(schema.trailEntries.updateId, params.updateId))
        .orderBy(schema.trailEntries.seq);

      const lastEntry = existingEntries[existingEntries.length - 1];
      const prevHash = lastEntry?.hash ?? "0".repeat(64);
      const nextSeq = (lastEntry?.seq ?? 0) + 1;

      const overrideEntry = appendEntry(
        {
          updateId: params.updateId,
          seq: nextSeq,
          at: atIso,
          actor: "user",
          type: "override",
          payload: {
            messageId: params.messageId,
            contactId: params.contactId,
            reason,
          },
        },
        prevHash,
      );

      await database.insert(schema.trailEntries).values({
        id: `${params.updateId}-${overrideEntry.seq}`,
        updateId: params.updateId,
        seq: overrideEntry.seq,
        at: new Date(overrideEntry.at),
        actor: overrideEntry.actor,
        type: overrideEntry.type,
        payloadJson: overrideEntry.payload,
        prevHash: overrideEntry.prevHash,
        hash: overrideEntry.hash,
      });

      const allEntries: TrailEntry[] = [
        ...existingEntries.map((e) => ({
          updateId: e.updateId,
          seq: e.seq,
          at: e.at.toISOString(),
          actor: e.actor as "user" | "ai" | "system",
          type: e.type as TrailEntryType,
          payload: e.payloadJson,
          prevHash: e.prevHash,
          hash: e.hash,
        })),
        overrideEntry,
      ];

      return {
        success: true,
        messageId: params.messageId,
        overridden: true,
        trailVerdict: verifyChain(allEntries),
      };
    } catch (error) {
      console.warn("Database overrideMessage failed, using local store:", error);
    }
  }

  // Local JSON fallback
  const messagesList = readJsonFile<StoredMessage>(MESSAGES_FILE);
  const msgIdx = messagesList.findIndex((m) => m.id === params.messageId);
  if (msgIdx !== -1) {
    messagesList[msgIdx]!.overridden = true;
    writeJsonFile(MESSAGES_FILE, messagesList);
  }

  const trailList = readJsonFile<TrailEntry>(TRAIL_FILE);
  const updateTrail = trailList.filter((t) => t.updateId === params.updateId);
  const lastEntry = updateTrail[updateTrail.length - 1];
  const prevHash = lastEntry?.hash ?? "0".repeat(64);
  const nextSeq = (lastEntry?.seq ?? 0) + 1;

  const overrideEntry = appendEntry(
    {
      updateId: params.updateId,
      seq: nextSeq,
      at: atIso,
      actor: "user",
      type: "override",
      payload: {
        messageId: params.messageId,
        contactId: params.contactId,
        reason,
      },
    },
    prevHash,
  );

  trailList.push(overrideEntry);
  writeJsonFile(TRAIL_FILE, trailList);
  updateTrail.push(overrideEntry);

  return {
    success: true,
    messageId: params.messageId,
    overridden: true,
    trailVerdict: verifyChain(updateTrail),
  };
}

export async function getUpdateTrail(updateId: string): Promise<TrailEntry[]> {
  if (env.hasDatabase) {
    try {
      const rows = await db()
        .select()
        .from(schema.trailEntries)
        .where(eq(schema.trailEntries.updateId, updateId))
        .orderBy(schema.trailEntries.seq);

      return rows.map((r) => ({
        updateId: r.updateId,
        seq: r.seq,
        at: r.at.toISOString(),
        actor: r.actor as "user" | "ai" | "system",
        type: r.type as TrailEntryType,
        payload: r.payloadJson,
        prevHash: r.prevHash,
        hash: r.hash,
      }));
    } catch {
      // fallback
    }
  }

  const trailList = readJsonFile<TrailEntry>(TRAIL_FILE);
  return trailList.filter((t) => t.updateId === updateId);
}
