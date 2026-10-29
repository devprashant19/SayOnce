import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { FanoutCard } from "@/app/api/fanout/route";
import type { Fact } from "./types";
import type { TrailEntry } from "./trail";
import type { VoiceReturn } from "./voice-return";

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

