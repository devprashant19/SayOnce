import { describe, expect, it } from "vitest";
import { RouteDecision, RouteResult } from "@/lib/types";

describe("route types and schemas", () => {
  it("validates a standard route decision", () => {
    const decision = RouteDecision.parse({
      contactId: "f_client",
      include: true,
      reason: "Needs payment demo milestone date",
      confidence: 0.95,
      factIds: ["f1", "f5"],
    });
    expect(decision.include).toBe(true);
    expect(decision.factIds).toHaveLength(2);
  });

  it("handles concerns nobody result", () => {
    const result = RouteResult.parse({
      concernsNobody: true,
      decisions: [
        {
          contactId: "f_client",
          include: false,
          reason: "Internal tooling discussion only",
          confidence: 0.9,
          factIds: [],
        },
      ],
    });
    expect(result.concernsNobody).toBe(true);
    expect(result.decisions[0]?.include).toBe(false);
  });
});

