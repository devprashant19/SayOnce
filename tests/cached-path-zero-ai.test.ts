import { describe, it, expect, beforeEach } from "vitest";
import { getAiCallCount, resetAiCallCount } from "@/lib/ai/call";
import { POST } from "@/app/api/fanout/route";
import demoUpdates from "@/data/demo/updates.json";

describe("P1c: Cached demo path makes exactly zero AI calls", () => {
  beforeEach(() => {
    resetAiCallCount();
  });

  it("verifies all 5 sample updates across both datasets (india & global)", () => {
    const ids = demoUpdates.map((u) => u.id);
    expect(ids).toEqual([
      "demo_in_1",
      "demo_in_2",
      "demo_in_3",
      "demo_gl_1",
      "demo_gl_2",
    ]);
  });

  for (const sample of demoUpdates) {
    it(`guarantees zero AI calls for sample ${sample.id} (${sample.contactSet}: "${sample.label}")`, async () => {
      resetAiCallCount();

      const requestWithId = new Request("http://localhost:3000/api/fanout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spokenText: sample.spokenText,
          project: sample.project,
          contactSet: sample.contactSet,
          demoId: sample.id,
        }),
      });

      const res1 = await POST(requestWithId);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.cached).toBe(true);
      expect(data1.cards.length).toBeGreaterThan(0);
      expect(getAiCallCount()).toBe(0);

      // Also verify when demoId is omitted and matched purely by spoken text
      resetAiCallCount();
      const requestByTextOnly = new Request("http://localhost:3000/api/fanout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spokenText: sample.spokenText,
          project: sample.project,
          contactSet: sample.contactSet,
        }),
      });

      const res2 = await POST(requestByTextOnly);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.cached).toBe(true);
      expect(getAiCallCount()).toBe(0);
    });
  }

  it("ensures total AI call count across all samples combined is exactly 0", async () => {
    resetAiCallCount();

    for (const sample of demoUpdates) {
      const res = await POST(
        new Request("http://localhost:3000/api/fanout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            spokenText: sample.spokenText,
            project: sample.project,
            contactSet: sample.contactSet,
            demoId: sample.id,
          }),
        }),
      );
      expect(res.status).toBe(200);
    }

    expect(getAiCallCount()).toBe(0);
  });
});

