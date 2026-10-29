import { createHash } from "node:crypto";
import type { TrailEntryType } from "./types";

/**
 * The Trust Trail.
 *
 * Every step of an update — what was spoken, what was extracted, who it was
 * routed to, each draft, each verify result, each human edit, each send — is
 * appended as a row carrying the hash of the row before it. Nothing is ever
 * updated or deleted; a correction is a new entry. "Verify trail" recomputes
 * the chain, so a row edited directly in the database turns the badge red at
 * exactly that row.
 *
 * Server-side only. The hash must never be computable from client code, or the
 * guarantee is theatre.
 */

export const GENESIS_HASH = "0".repeat(64);

export interface TrailEntryInput {
  updateId: string;
  seq: number;
  at: string;
  actor: "user" | "ai" | "system";
  type: TrailEntryType;
  payload: unknown;
}

export interface TrailEntry extends TrailEntryInput {
  prevHash: string;
  hash: string;
}

/**
 * Canonical JSON: keys sorted at every depth, no incidental whitespace. Two
 * runs over the same data must produce the same bytes or the chain is useless.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function hashEntry(entry: TrailEntryInput, prevHash: string): string {
  const canonical = canonicalJson({
    updateId: entry.updateId,
    seq: entry.seq,
    at: entry.at,
    actor: entry.actor,
    type: entry.type,
    payload: entry.payload,
  });
  return createHash("sha256").update(prevHash + canonical, "utf8").digest("hex");
}

export function appendEntry(entry: TrailEntryInput, prevHash: string): TrailEntry {
  return { ...entry, prevHash, hash: hashEntry(entry, prevHash) };
}

/** Build a whole chain from scratch, used by seeds and tests. */
export function buildChain(entries: TrailEntryInput[]): TrailEntry[] {
  let prev = GENESIS_HASH;
  const chain: TrailEntry[] = [];
  for (const entry of entries) {
    const linked = appendEntry(entry, prev);
    chain.push(linked);
    prev = linked.hash;
  }
  return chain;
}

export type TrailVerdict =
  | { ok: true; length: number }
  | { ok: false; length: number; brokenAtSeq: number; reason: string };

/** Recompute the chain. This is what the "Verify trail" button calls. */
export function verifyChain(entries: TrailEntry[]): TrailVerdict {
  let prev = GENESIS_HASH;
  for (const [index, entry] of entries.entries()) {
    if (entry.prevHash !== prev) {
      return {
        ok: false,
        length: entries.length,
        brokenAtSeq: entry.seq,
        reason: `Entry ${entry.seq} points at a different previous entry than the one before it.`,
      };
    }
    const expected = hashEntry(entry, prev);
    if (expected !== entry.hash) {
      return {
        ok: false,
        length: entries.length,
        brokenAtSeq: entry.seq,
        reason: `Entry ${entry.seq} (${entry.type}) was altered after it was written.`,
      };
    }
    if (entry.seq !== index + 1) {
      return {
        ok: false,
        length: entries.length,
        brokenAtSeq: entry.seq,
        reason: `Entry ${entry.seq} is out of order; an entry is missing or was inserted.`,
      };
    }
    prev = entry.hash;
  }
  return { ok: true, length: entries.length };
}

/** Short form shown in the UI and the landing page's Trust scene. */
export function shortHash(hash: string): string {
  return hash.slice(0, 8);
}
