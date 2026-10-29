import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AiQuotaExhaustedError,
  isQuotaExhaustedError,
  QUOTA_EXHAUSTED_MESSAGE,
} from "@/lib/ai/call";
import { POST } from "@/app/api/fanout/route";
import * as extractModule from "@/lib/ai/extract";

describe("P1a: Quota exhaustion error handling (429)", () => {
  it("detects quota exhaustion and RESOURCE_EXHAUSTED errors accurately", () => {
    const googleQuotaError = new Error(
      "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [429 Too Many Requests] RESOURCE_EXHAUSTED. limit: 20, model: gemini-2.5-flash, retry in ~13h",
    );
    expect(isQuotaExhaustedError(googleQuotaError)).toBe(true);

    const status429Error = { status: 429, message: "Too Many Requests" };
    expect(isQuotaExhaustedError(status429Error)).toBe(true);

    const customQuotaError = new AiQuotaExhaustedError("extract");
    expect(isQuotaExhaustedError(customQuotaError)).toBe(true);

    const normalError = new Error("Invalid json schema structure");
    expect(isQuotaExhaustedError(normalError)).toBe(false);
  });

  it("returns HTTP 429 with clean message and no provider leak when provider quota is exhausted", async () => {
    // Spy on extract to simulate provider 429 RESOURCE_EXHAUSTED
    const mockProviderError = new Error(
      "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [429 Too Many Requests] RESOURCE_EXHAUSTED. limit: 20, model: gemini-2.5-flash",
    );
    vi.spyOn(extractModule, "extract").mockRejectedValueOnce(
      new AiQuotaExhaustedError("extract", undefined, mockProviderError),
    );

    const request = new Request("http://localhost:3000/api/fanout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        spokenText: "Unique spoken update not in cached fixtures - delivery delayed to Friday.",
        project: "Custom Project",
        contactSet: "india",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const body = await response.json();
    const rawResponse = JSON.stringify(body);

    // Exact required message
    expect(body.error).toBe(
      "The daily AI limit has been reached. The sample updates still work instantly — pick one below.",
    );

    // Hard assertions: Never leak provider error text, quota, RESOURCE_EXHAUSTED, or URLs
    expect(rawResponse.toLowerCase()).not.toContain("quota");
    expect(rawResponse).not.toContain("RESOURCE_EXHAUSTED");
    expect(rawResponse).not.toMatch(/https?:\/\//);
    expect(rawResponse).not.toContain("gemini-2.5-flash");
    expect(rawResponse).not.toContain("generativelanguage.googleapis.com");
  });
});

