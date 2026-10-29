import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// In-memory counters for live AI demo guard rails
interface SessionCounter {
  count: number;
  lastUsedAt: number;
}

const sessionAiUsage = new Map<string, SessionCounter>();
let dailyAiUsageDate = new Date().toISOString().slice(0, 10);
let dailyAiUsageCount = 0;

function cleanOldSessions() {
  const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
  for (const [id, record] of sessionAiUsage.entries()) {
    if (record.lastUsedAt < cutoff) {
      sessionAiUsage.delete(id);
    }
  }
}

/**
 * Creates a signed session token: sessionId.createdAt.signature
 */
export function createSignedDemoSession(): { sessionId: string; token: string } {
  const sessionId = crypto.randomUUID();
  const createdAt = Date.now();
  const payload = `${sessionId}.${createdAt}`;
  const hmac = createHmac("sha256", env.demoSessionSecret);
  hmac.update(payload);
  const signature = hmac.digest("base64url");
  return {
    sessionId,
    token: `${payload}.${signature}`,
  };
}

/**
 * Validates a signed demo session token.
 */
export function verifyDemoSessionToken(token: string | null | undefined): {
  valid: boolean;
  sessionId?: string;
  reason?: string;
} {
  if (!token) {
    return { valid: false, reason: "No session token provided" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "Malformed session token" };
  }

  const [sessionId, createdAtStr, signature] = parts;
  if (!sessionId || !createdAtStr || !signature) {
    return { valid: false, reason: "Incomplete session token" };
  }

  const createdAt = Number(createdAtStr);
  if (!Number.isFinite(createdAt)) {
    return { valid: false, reason: "Invalid timestamp in session token" };
  }

  if (Date.now() - createdAt > TWENTY_FOUR_HOURS_MS) {
    return { valid: false, reason: "Session token expired (>24h)" };
  }

  const payload = `${sessionId}.${createdAtStr}`;
  const hmac = createHmac("sha256", env.demoSessionSecret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("base64url");

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, reason: "Invalid token signature" };
    }
  } catch {
    return { valid: false, reason: "Signature comparison error" };
  }

  return { valid: true, sessionId };
}

export type DemoAiCheckResult =
  | { allowed: true; sessionId: string }
  | { allowed: false; status: number; message: string; isKillSwitch?: boolean };

/**
 * Checks whether live AI execution is permitted for this demo session.
 * Live AI is blocked when:
 * 1. DEMO_LIVE_AI is off (kill switch)
 * 2. Session exceeded DEMO_SESSION_AI_CAP
 * 3. Deployment exceeded DEMO_DAILY_AI_CAP
 */
export function checkDemoAiAllowance(sessionToken: string | null | undefined): DemoAiCheckResult {
  // 1. Kill switch
  if (!env.demoLiveAi) {
    return {
      allowed: false,
      status: 429,
      isKillSwitch: true,
      message:
        "Live AI is currently paused to conserve demonstration quota. " +
        "Please select one of the pre-computed sample updates above — they run instantly with complete, verified drafts.",
    };
  }

  // 2. Validate token (or create ephemeral session if valid format)
  const verified = verifyDemoSessionToken(sessionToken);
  let sessionId = verified.sessionId;
  if (!verified.valid || !sessionId) {
    // Issue fallback sessionId for unauthenticated demo requests
    sessionId = crypto.randomUUID();
  }

  // 3. Reset daily counter if day rolled over
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyAiUsageDate) {
    dailyAiUsageDate = today;
    dailyAiUsageCount = 0;
    cleanOldSessions();
  }

  // 4. Check deployment daily cap
  if (dailyAiUsageCount >= env.demoDailyAiCap) {
    return {
      allowed: false,
      status: 429,
      message:
        `Deployment daily live AI cap (${env.demoDailyAiCap} calls) reached. ` +
        "Please try the pre-cached sample updates above — they execute instantly without model calls.",
    };
  }

  // 5. Check session cap
  const sessionRecord = sessionAiUsage.get(sessionId) ?? { count: 0, lastUsedAt: Date.now() };
  if (sessionRecord.count >= env.demoSessionAiCap) {
    return {
      allowed: false,
      status: 429,
      message:
        `You have used all ${env.demoSessionAiCap} custom live AI calls for this demo session. ` +
        "Select any of the sample updates above to continue exploring with instant, verified drafts.",
    };
  }

  return { allowed: true, sessionId };
}

/**
 * Records a successful live AI call against demo caps.
 */
export function recordDemoAiUsage(sessionId: string): void {
  dailyAiUsageCount++;
  const sessionRecord = sessionAiUsage.get(sessionId) ?? { count: 0, lastUsedAt: Date.now() };
  sessionRecord.count++;
  sessionRecord.lastUsedAt = Date.now();
  sessionAiUsage.set(sessionId, sessionRecord);
}
