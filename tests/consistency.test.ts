import { describe, expect, it } from "vitest";
import { detectContradictions, type PastFactEntry } from "@/lib/consistency";
import type { Fact } from "@/lib/types";

describe("Consistency Guard", () => {
  const recipient = { id: "f_client", name: "Meera" };

  it("catches 5 of 5 planted contradictions", () => {
    // 1. Delivery date contradiction
    const pastDelivery: PastFactEntry = {
      factId: "f_past_1",
      updateId: "u_1",
      spokenOn: "2026-10-27",
      text: "Delivery will be on Friday 30 October",
      type: "date",
      values: { numbers: [], datesIso: ["2026-10-30"], names: [] },
      recipientIds: ["f_client"],
    };
    const currentDelivery: Fact = {
      id: "f_curr_1",
      text: "Delivery moves to Monday 2 November",
      type: "date",
      values: { numbers: [], datesIso: ["2026-11-02"], names: [] },
      sourceSpan: { start: 0, end: 35 },
      privacy: { blockedFor: [], reason: "" },
    };
    const c1 = detectContradictions({
      currentFacts: [currentDelivery],
      pastFacts: [pastDelivery],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(c1.length).toBe(1);
    expect(c1[0]!.topic).toBe("delivery");
    expect(c1[0]!.suggestedCorrection).toContain("2026-10-30");

    // 2. Price/rate contradiction
    const pastRate: PastFactEntry = {
      factId: "f_past_2",
      updateId: "u_2",
      spokenOn: "2026-10-25",
      text: "Hourly rate is $50 per hour",
      type: "quantity",
      values: { numbers: ["50"], datesIso: [], names: [] },
      recipientIds: ["f_client"],
    };
    const currentRate: Fact = {
      id: "f_curr_2",
      text: "Hourly rate for the project is $60 per hour",
      type: "quantity",
      values: { numbers: ["60"], datesIso: [], names: [] },
      sourceSpan: { start: 0, end: 40 },
      privacy: { blockedFor: [], reason: "" },
    };
    const c2 = detectContradictions({
      currentFacts: [currentRate],
      pastFacts: [pastRate],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(c2.length).toBe(1);
    expect(c2[0]!.topic).toBe("rate");

    // 3. Milestone deadline contradiction
    const pastMilestone: PastFactEntry = {
      factId: "f_past_3",
      updateId: "u_3",
      spokenOn: "2026-10-20",
      text: "Milestone two deadline is 2026-10-30",
      type: "date",
      values: { numbers: ["2"], datesIso: ["2026-10-30"], names: [] },
      recipientIds: ["f_client"],
    };
    const currentMilestone: Fact = {
      id: "f_curr_3",
      text: "Milestone two will be completed by 2026-11-15",
      type: "date",
      values: { numbers: ["2"], datesIso: ["2026-11-15"], names: [] },
      sourceSpan: { start: 0, end: 45 },
      privacy: { blockedFor: [], reason: "" },
    };
    const c3 = detectContradictions({
      currentFacts: [currentMilestone],
      pastFacts: [pastMilestone],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(c3.length).toBe(1);
    expect(c3[0]!.topic).toBe("milestone");

    // 4. Endpoint URL contradiction
    const pastEndpoint: PastFactEntry = {
      factId: "f_past_4",
      updateId: "u_4",
      spokenOn: "2026-10-22",
      text: "The payment endpoint is /payment/callback",
      type: "status",
      values: { numbers: [], datesIso: [], names: [] },
      recipientIds: ["f_client"],
    };
    const currentEndpoint: Fact = {
      id: "f_curr_4",
      text: "The payment endpoint is /v2/payment/webhook",
      type: "status",
      values: { numbers: [], datesIso: [], names: [] },
      sourceSpan: { start: 0, end: 42 },
      privacy: { blockedFor: [], reason: "" },
    };
    const c4 = detectContradictions({
      currentFacts: [currentEndpoint],
      pastFacts: [pastEndpoint],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(c4.length).toBe(1);
    expect(c4[0]!.topic).toBe("endpoint");

    // 5. Shift timing contradiction
    const pastShift: PastFactEntry = {
      factId: "f_past_5",
      updateId: "u_5",
      spokenOn: "2026-10-24",
      text: "Warehouse shift starts on Friday",
      type: "date",
      values: { numbers: [], datesIso: [], names: [] },
      recipientIds: ["f_client"],
    };
    const currentShift: Fact = {
      id: "f_curr_5",
      text: "Warehouse shift will now start on Monday",
      type: "date",
      values: { numbers: [], datesIso: [], names: [] },
      sourceSpan: { start: 0, end: 40 },
      privacy: { blockedFor: [], reason: "" },
    };
    const c5 = detectContradictions({
      currentFacts: [currentShift],
      pastFacts: [pastShift],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(c5.length).toBe(1);
    expect(c5[0]!.topic).toBe("shift");
  });

  it("raises 0 false alarms on 5 consistent follow-ups", () => {
    // 1. Separate non-conflicting topics (login bug vs rate limiting)
    const pastBug: PastFactEntry = {
      factId: "f_past_bug",
      updateId: "u_bug",
      spokenOn: "2026-10-26",
      text: "Login flow OTP race condition bug is fixed",
      type: "status",
      values: { numbers: [], datesIso: [], names: [] },
      recipientIds: ["f_client"],
    };
    const currentRateLimit: Fact = {
      id: "f_curr_rl",
      text: "Added rate limiting with 3 attempts per minute on login endpoint",
      type: "status",
      values: { numbers: ["3"], datesIso: [], names: [] },
      sourceSpan: { start: 0, end: 50 },
      privacy: { blockedFor: [], reason: "" },
    };
    const fa1 = detectContradictions({
      currentFacts: [currentRateLimit],
      pastFacts: [pastBug],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(fa1.length).toBe(0);

    // 2. Reconfirmation of same delivery date (no change)
    const pastDelivery: PastFactEntry = {
      factId: "f_past_deliv",
      updateId: "u_deliv",
      spokenOn: "2026-10-26",
      text: "Delivery scheduled for 2026-10-30",
      type: "date",
      values: { numbers: [], datesIso: ["2026-10-30"], names: [] },
      recipientIds: ["f_client"],
    };
    const currentReconfirm: Fact = {
      id: "f_curr_reconfirm",
      text: "Reminder that delivery is still 2026-10-30",
      type: "date",
      values: { numbers: [], datesIso: ["2026-10-30"], names: [] },
      sourceSpan: { start: 0, end: 40 },
      privacy: { blockedFor: [], reason: "" },
    };
    const fa2 = detectContradictions({
      currentFacts: [currentReconfirm],
      pastFacts: [pastDelivery],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(fa2.length).toBe(0);

    // 3. Different recipient fact (irrelevant to this recipient)
    const pastOtherRecipient: PastFactEntry = {
      factId: "f_past_other",
      updateId: "u_other",
      spokenOn: "2026-10-26",
      text: "Delivery for vendor is Friday",
      type: "date",
      values: { numbers: [], datesIso: [], names: [] },
      recipientIds: ["f_vendor_only"], // NOT f_client
    };
    const currentDeliveryMeera: Fact = {
      id: "f_curr_meera",
      text: "Delivery for client is Monday",
      type: "date",
      values: { numbers: [], datesIso: [], names: [] },
      sourceSpan: { start: 0, end: 30 },
      privacy: { blockedFor: [], reason: "" },
    };
    const fa3 = detectContradictions({
      currentFacts: [currentDeliveryMeera],
      pastFacts: [pastOtherRecipient],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(fa3.length).toBe(0);

    // 4. Additive new feature without conflict
    const pastFeature: PastFactEntry = {
      factId: "f_past_feat",
      updateId: "u_feat",
      spokenOn: "2026-10-26",
      text: "QA round one completed with build 42",
      type: "status",
      values: { numbers: ["42"], datesIso: [], names: [] },
      recipientIds: ["f_client"],
    };
    const currentFeature: Fact = {
      id: "f_curr_feat2",
      text: "Added dark mode toggle to settings screen",
      type: "status",
      values: { numbers: [], datesIso: [], names: [] },
      sourceSpan: { start: 0, end: 40 },
      privacy: { blockedFor: [], reason: "" },
    };
    const fa4 = detectContradictions({
      currentFacts: [currentFeature],
      pastFacts: [pastFeature],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(fa4.length).toBe(0);

    // 5. New minor bug report (distinct bug count, not a conflict)
    const pastBugs: PastFactEntry = {
      factId: "f_past_bugs",
      updateId: "u_bugs",
      spokenOn: "2026-10-26",
      text: "Found two bugs in profile screen",
      type: "quantity",
      values: { numbers: ["2"], datesIso: [], names: [] },
      recipientIds: ["f_client"],
    };
    const currentNewTasks: Fact = {
      id: "f_curr_tasks",
      text: "Assigned four tasks to backend team",
      type: "quantity",
      values: { numbers: ["4"], datesIso: [], names: [] },
      sourceSpan: { start: 0, end: 35 },
      privacy: { blockedFor: [], reason: "" },
    };
    const fa5 = detectContradictions({
      currentFacts: [currentNewTasks],
      pastFacts: [pastBugs],
      recipientId: recipient.id,
      recipientName: recipient.name,
    });
    expect(fa5.length).toBe(0);
  });

  it("does not flag a fact against an identical restatement of itself", () => {
    // Every prepared fan-out is persisted like a real update, so pressing Fan
    // out twice on the same sample used to raise an alert per fact against its
    // own earlier copy. Restating a fact is not contradicting it.
    const past: PastFactEntry = {
      factId: "f_past_same",
      updateId: "u_earlier_run",
      spokenOn: "2026-10-30",
      text: "Delivery moves to Monday 2 November.",
      type: "date",
      values: { numbers: [], datesIso: ["2026-11-02"], names: [] },
      recipientIds: ["f_client"],
    };
    const current: Fact = {
      id: "f_curr_same",
      // Same statement, different id, incidental spacing and case.
      text: "delivery moves to  Monday 2 November",
      type: "date",
      values: { numbers: [], datesIso: ["2026-11-02"], names: [] },
      sourceSpan: { start: 0, end: 36 },
      privacy: { blockedFor: [], reason: "" },
    };
    expect(
      detectContradictions({
        currentFacts: [current],
        pastFacts: [past],
        recipientId: recipient.id,
        recipientName: recipient.name,
      }),
    ).toEqual([]);
  });
});
