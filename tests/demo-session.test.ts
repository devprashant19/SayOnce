import { describe, it, expect, beforeEach } from "vitest";
import {
  createSignedDemoSession,
  verifyDemoSessionToken,
  checkDemoAiAllowance,
  recordDemoAiUsage,
} from "@/lib/demo-session";

describe("Demo session tokens and rate caps", () => {
  it("generates a valid signed demo session token", () => {
    const { sessionId, token } = createSignedDemoSession();
    expect(sessionId).toBeTruthy();
    expect(token).toBeTruthy();

    const verification = verifyDemoSessionToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.sessionId).toBe(sessionId);
  });

  it("rejects tampered session tokens", () => {
    const { token } = createSignedDemoSession();
    const tampered = token.slice(0, -4) + "XXXX";
    const verification = verifyDemoSessionToken(tampered);
    expect(verification.valid).toBe(false);
  });

  it("rejects malformed session tokens", () => {
    expect(verifyDemoSessionToken("not-a-token").valid).toBe(false);
    expect(verifyDemoSessionToken("").valid).toBe(false);
    expect(verifyDemoSessionToken(null).valid).toBe(false);
  });

  it("enforces session AI caps correctly", () => {
    const { sessionId, token } = createSignedDemoSession();

    // Check initial allowance
    const initial = checkDemoAiAllowance(token);
    expect(initial.allowed).toBe(true);

    // Record usage up to cap (default cap is 10)
    for (let i = 0; i < 10; i++) {
      recordDemoAiUsage(sessionId);
    }

    const capped = checkDemoAiAllowance(token);
    expect(capped.allowed).toBe(false);
    if (!capped.allowed) {
      expect(capped.message).toContain("custom live AI calls");
    }
  });
});

