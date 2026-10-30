import { describe, expect, it } from "vitest";
import { AiQuotaExhaustedError, perMinuteRetryMs } from "@/lib/ai/call";

/**
 * The free tier allows 15 requests a minute and one fan-out makes 7-12, so a
 * second take inside the same minute hit the limit and dropped into instant
 * mode. Google says when to retry; a per-minute limit is worth one wait.
 */
const perMinute = (seconds: string) =>
  new Error(
    `{"error":{"code":429,"message":"You exceeded your current quota","status":"RESOURCE_EXHAUSTED","details":[` +
      `{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaValue":"15"},{"retryDelay":"${seconds}s"}]}}`,
  );

describe("perMinuteRetryMs", () => {
  it("waits as long as Google asks for a per-minute limit, plus a margin", () => {
    expect(perMinuteRetryMs(perMinute("14"))).toBe(14_500);
  });

  it("does not wait longer than the cap", () => {
    expect(perMinuteRetryMs(perMinute("45"))).toBeNull();
  });

  it("does not retry a daily quota", () => {
    const daily = new Error('{"error":{"code":429,"details":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}}');
    expect(perMinuteRetryMs(daily)).toBeNull();
    expect(perMinuteRetryMs(new AiQuotaExhaustedError("extract"))).toBeNull();
  });

  it("ignores errors that are not rate limits", () => {
    expect(perMinuteRetryMs(new Error("schema mismatch"))).toBeNull();
  });
});
