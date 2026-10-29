import { describe, expect, it } from "vitest";
import {
  buildChain,
  canonicalJson,
  GENESIS_HASH,
  verifyChain,
  type TrailEntryInput,
} from "@/lib/trail";

function entries(): TrailEntryInput[] {
  return [
    {
      updateId: "u1",
      seq: 1,
      at: "2026-10-29T10:00:00.000Z",
      actor: "user",
      type: "spoken",
      payload: { text: "Delivery moves to Monday" },
    },
    {
      updateId: "u1",
      seq: 2,
      at: "2026-10-29T10:00:04.000Z",
      actor: "ai",
      type: "extracted",
      payload: { factIds: ["f1", "f2"] },
    },
    {
      updateId: "u1",
      seq: 3,
      at: "2026-10-29T10:00:09.000Z",
      actor: "ai",
      type: "composed",
      payload: { drafts: [{ contactId: "c1" }] },
    },
  ];
}

describe("canonicalJson", () => {
  it("is independent of key order", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it("is stable for nested objects and arrays", () => {
    const left = { x: [{ q: 1, p: 2 }], y: { n: null } };
    const right = { y: { n: null }, x: [{ p: 2, q: 1 }] };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
  });

  it("drops undefined rather than emitting invalid JSON", () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe("chain", () => {
  it("starts from the genesis hash", () => {
    const chain = buildChain(entries());
    expect(chain[0]?.prevHash).toBe(GENESIS_HASH);
  });

  it("links each entry to the one before it", () => {
    const chain = buildChain(entries());
    expect(chain[1]?.prevHash).toBe(chain[0]?.hash);
    expect(chain[2]?.prevHash).toBe(chain[1]?.hash);
  });

  it("is deterministic across runs", () => {
    expect(buildChain(entries()).map((e) => e.hash)).toEqual(
      buildChain(entries()).map((e) => e.hash),
    );
  });

  it("verifies an untouched chain", () => {
    const verdict = verifyChain(buildChain(entries()));
    expect(verdict.ok).toBe(true);
    expect(verdict.length).toBe(3);
  });
});

describe("tamper detection", () => {
  it("turns red at the row whose payload was edited", () => {
    const chain = buildChain(entries());
    chain[1] = { ...chain[1]!, payload: { factIds: ["f1"] } };
    const verdict = verifyChain(chain);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.brokenAtSeq).toBe(2);
      expect(verdict.reason).toContain("altered");
    }
  });

  it("catches a deleted entry", () => {
    const chain = buildChain(entries());
    const verdict = verifyChain([chain[0]!, chain[2]!]);
    expect(verdict.ok).toBe(false);
  });

  it("catches a re-signed entry whose predecessor changed", () => {
    // The hardest case: an attacker edits a row and recomputes its own hash,
    // but the next row still points at the old one.
    const chain = buildChain(entries());
    const forged = buildChain([
      { ...entries()[0]!, payload: { text: "Delivery moves to Friday" } },
    ])[0]!;
    const verdict = verifyChain([forged, chain[1]!, chain[2]!]);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.brokenAtSeq).toBe(2);
  });

  it("catches an inserted entry", () => {
    const chain = buildChain(entries());
    const verdict = verifyChain([chain[0]!, chain[0]!, chain[1]!]);
    expect(verdict.ok).toBe(false);
  });

  it("accepts an empty chain", () => {
    expect(verifyChain([]).ok).toBe(true);
  });
});
