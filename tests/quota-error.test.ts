import { describe, it, expect, vi } from "vitest";
import {
  AiQuotaExhaustedError,
  isQuotaExhaustedError,
  INSTANT_MODE_MESSAGE,
} from "@/lib/ai/call";
import { POST } from "@/app/api/fanout/route";
import * as extractModule from "@/lib/ai/extract";

const GOOGLE_QUOTA_ERROR =
  "[GoogleGenerativeAI Error]: Error fetching from " +
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: " +
  "[429 Too Many Requests] RESOURCE_EXHAUSTED. limit: 20, model: gemini-2.5-flash, retry in ~13h";

describe("provider quota detection", () => {
  it("recognises the shapes a provider limit arrives in", () => {
    expect(isQuotaExhaustedError(new Error(GOOGLE_QUOTA_ERROR))).toBe(true);
    expect(isQuotaExhaustedError({ status: 429, message: "Too Many Requests" })).toBe(true);
    expect(isQuotaExhaustedError(new AiQuotaExhaustedError("extract"))).toBe(true);
    expect(isQuotaExhaustedError(new Error("Invalid json schema structure"))).toBe(false);
  });
});

/**
 * The product rule: when live AI cannot serve a request, the app shows
 * prepared output instead of a failure. A judge who hits this must still see a
 * full fan-out, must never see provider internals, and must never be told that
 * something is broken.
 */
describe("instant mode: live AI unavailable", () => {
  async function fanoutWithProviderLimit() {
    vi.spyOn(extractModule, "extract").mockRejectedValueOnce(
      new AiQuotaExhaustedError("extract", undefined, new Error(GOOGLE_QUOTA_ERROR)),
    );
    return POST(
      new Request("http://localhost:3000/api/fanout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spokenText: "An update that matches no prepared sample, delivery moved to Friday.",
          project: "Custom Project",
          contactSet: "india",
        }),
      }),
    );
  }

  it("returns a prepared fan-out, not an error", async () => {
    const response = await fanoutWithProviderLimit();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.mode).toBe("instant");
    expect(body.message).toBe(INSTANT_MODE_MESSAGE);
    expect(body.error ?? null).toBeNull();

    // A real fan-out, with drafts a judge can read and a chain that verifies.
    expect(body.cards.length).toBeGreaterThan(0);
    expect(body.cards.some((c: { draft: unknown }) => c.draft !== null)).toBe(true);
    expect(body.trailVerdict.ok).toBe(true);

    // It names the prepared update it is showing, so the UI can line the input
    // up with the cards instead of showing cards for other words.
    expect(typeof body.preparedFrom).toBe("string");
    expect(typeof body.preparedText).toBe("string");
    expect(body.preparedText.length).toBeGreaterThan(0);
  });

  it("leaks nothing about the provider", async () => {
    const response = await fanoutWithProviderLimit();
    const body = (await response.json()) as { message?: string; error?: string };
    const raw = JSON.stringify(body);

    expect(raw.toLowerCase()).not.toContain("quota");
    expect(raw).not.toContain("RESOURCE_EXHAUSTED");
    expect(raw).not.toContain("generativelanguage.googleapis.com");
    expect(raw).not.toContain("gemini-2.5-flash");
    expect(raw).not.toContain("429 Too Many Requests");
    expect(raw).not.toContain("HTTP 429");
    expect(body.error).toBeUndefined();
    expect(body.message).not.toContain("429");
  });

  it("falls back for any live-AI failure, not only a provider limit", async () => {
    // A withdrawn model, a rotated key and a network blip all land here. The
    // person asked for a fan-out; they get one.
    vi.spyOn(extractModule, "extract").mockRejectedValueOnce(
      new Error("models/some-model is no longer available to new users"),
    );
    const response = await POST(
      new Request("http://localhost:3000/api/fanout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spokenText: "Another update matching no prepared sample at all.",
          project: "Custom Project",
          contactSet: "india",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mode).toBe("instant");
    expect(body.cards.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain("no longer available");
  });

  it("answers with instant mode when a live run is too slow, instead of timing out", async () => {
    // Production returned a raw 504: with unbounded thinking one fan-out took
    // 79.6s against a 60s function limit, and the platform killed it before
    // any catch block ran. A live step that never answers must still produce
    // a prepared fan-out, well inside the budget.
    process.env.SAYONCE_LIVE_BUDGET_MS = "250";
    try {
      vi.spyOn(extractModule, "extract").mockImplementationOnce(
        () => new Promise(() => undefined), // never settles
      );
      const started = Date.now();
      const response = await POST(
        new Request("http://localhost:3000/api/fanout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            spokenText: "A slow update that matches no prepared sample at all.",
            project: "Custom Project",
            contactSet: "india",
          }),
        }),
      );
      const elapsed = Date.now() - started;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mode).toBe("instant");
      expect(body.cards.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(5_000);
    } finally {
      delete process.env.SAYONCE_LIVE_BUDGET_MS;
    }
  });

  it("serves instant mode when the demo live-AI switch is off, not a 429", async () => {
    // A spent demo cap answered with a 429 and "Live AI is currently paused to
    // conserve demonstration quota" — a judge mid-demo saw a quota message.
    process.env.DEMO_LIVE_AI = "false";
    try {
      const response = await POST(
        new Request("http://localhost:3000/api/fanout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            spokenText: "A capped update that matches no prepared sample at all.",
            project: "Custom Project",
            contactSet: "india",
          }),
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mode).toBe("instant");
      expect(body.cards.length).toBeGreaterThan(0);
      expect(JSON.stringify(body).toLowerCase()).not.toMatch(/quota|paused|cap\b/);
    } finally {
      delete process.env.DEMO_LIVE_AI;
    }
  });

  it("never hands a Quality Lab case a prepared fan-out for another update", async () => {
    // The lab grades what the pipeline produced for this case. Instant mode's
    // prepared output belongs to a different update, so grading it would
    // score the wrong text; the case must come back as not run.
    vi.spyOn(extractModule, "extract").mockRejectedValueOnce(new Error("network blip"));
    const response = await POST(
      new Request("http://localhost:3000/api/fanout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spokenText: "A golden case that matches no prepared sample.",
          contactSet: "freelance",
          source: "lab",
        }),
      }),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.cards).toBeUndefined();
    expect(body.mode).toBeUndefined();
  });

  it("never phrases instant mode as a failure", async () => {
    const response = await fanoutWithProviderLimit();
    const body = await response.json();

    // The one sentence a person reads on this path.
    const shown = String(body.message).toLowerCase();
    for (const word of [
      "limit",
      "quota",
      "exhausted",
      "error",
      "failed",
      "failure",
      "unavailable",
      "try again",
      "api",
      "down",
    ]) {
      expect(shown).not.toContain(word);
    }
  });
});
