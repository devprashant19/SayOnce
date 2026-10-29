import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { FanoutCard } from "@/app/api/fanout/route";
import type { Fact } from "./types";
import type { TrailEntry } from "./trail";
import type { VoiceReturn } from "./voice-return";
import demoUpdates from "@/data/demo/updates.json";

export interface CachedFanoutResult {
  updateId: string;
  at: string;
  project?: string;
  spokenText: string;
  masked: string[];
  summary: string;
  decisions: string[];
  facts: Fact[];
  cards: FanoutCard[];
  routing: unknown;
  voiceReturn: VoiceReturn;
  trail: TrailEntry[];
  trailVerdict: { ok: boolean; length: number };
  cached: boolean;
}

const CACHE_FILE = join(process.cwd(), "data", "demo", "cached-results.json");

let memoryCache: Record<string, CachedFanoutResult> | null = null;

function loadCache(): Record<string, CachedFanoutResult> {
  if (memoryCache) return memoryCache;

  if (existsSync(CACHE_FILE)) {
    try {
      memoryCache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
      return memoryCache!;
    } catch (err) {
      console.warn("Failed to parse demo cache file:", err);
    }
  }
  return {};
}

/**
 * Returns pre-cached pipeline results for sample demo updates.
 * Matches by exact text or demo update ID (e.g. "demo_in_1").
 */
export function getCachedDemoResult(keyOrText: string): CachedFanoutResult | null {
  const cache = loadCache();
  const trimmed = keyOrText.trim();
  if (cache[trimmed]) {
    return cache[trimmed]!;
  }

  // Also check normalized spaces
  const normalized = trimmed.replace(/\s+/g, " ");
  for (const [k, v] of Object.entries(cache)) {
    if (k.replace(/\s+/g, " ") === normalized) {
      return v;
    }
  }

  return null;
}


interface DemoUpdateMeta {
  id: string;
  contactSet: string;
  spokenText: string;
}

/**
 * The prepared fan-out to show when live AI is unavailable for a request.
 * Prefers a sample built for the roster the caller asked for, so the cards on
 * screen belong to the people on screen; falls back to any prepared sample.
 */
export function getPreparedFallback(
  contactSet: string,
): { id: string; result: CachedFanoutResult } | null {
  const all = demoUpdates as DemoUpdateMeta[];
  const preferred = all.filter((u) => u.contactSet === contactSet);
  for (const update of [...preferred, ...all]) {
    const result =
      getCachedDemoResult(update.id) ?? getCachedDemoResult(update.spokenText);
    if (result) return { id: update.id, result };
  }
  return null;
}
