#!/usr/bin/env node
/**
 * Tamper Test for the Trust Trail.
 *
 * Verifies that the cryptographic hash chain catches:
 * 1. An untouched chain (PASS: green, intact)
 * 2. An edited payload in a row (FAIL: red at exactly that altered row)
 * 3. A deleted row from the middle (FAIL: red at missing sequence)
 * 4. An inserted row between two existing rows (FAIL: red at sequence break)
 * 5. A re-signed row where the attacker recomputed hash(altered, prev) but
 *    the successor still points at the old hash (FAIL: red at successor)
 *
 * Run it directly:
 *   node scripts/tamper-trail-test.mjs
 */

import { buildChain, verifyChain, hashEntry, appendEntry, GENESIS_HASH } from "../lib/trail.ts";

console.log("Trust Trail Cryptographic Tamper Test\n");

const baseInputs = [
  {
    updateId: "update-proof-01",
    seq: 1,
    at: "2026-10-29T10:00:00.000Z",
    actor: "user",
    type: "spoken",
    payload: { text: "Payments screen is done" },
  },
  {
    updateId: "update-proof-01",
    seq: 2,
    at: "2026-10-29T10:00:02.000Z",
    actor: "ai",
    type: "extracted",
    payload: { factIds: ["f1", "f2"] },
  },
  {
    updateId: "update-proof-01",
    seq: 3,
    at: "2026-10-29T10:00:05.000Z",
    actor: "ai",
    type: "composed",
    payload: { drafts: [{ contactId: "f_client" }, { contactId: "f_backend" }] },
  },
  {
    updateId: "update-proof-01",
    seq: 4,
    at: "2026-10-29T10:00:08.000Z",
    actor: "user",
    type: "sent",
    payload: { contactId: "f_client", channel: "email" },
  },
];

let allPassed = true;

// Test 1: Untouched chain
const cleanChain = buildChain(baseInputs);
const v1 = verifyChain(cleanChain);
if (v1.ok && v1.length === 4) {
  console.log("✓ Test 1 Passed: Untouched chain verifies intact (length 4).");
} else {
  console.error("✗ Test 1 Failed:", v1);
  allPassed = false;
}

// Test 2: Altered payload at row 2
const tamperedPayloadChain = JSON.parse(JSON.stringify(cleanChain));
tamperedPayloadChain[1].payload = { factIds: ["f1", "f2", "f_INVENTED"] };
const v2 = verifyChain(tamperedPayloadChain);
if (!v2.ok && v2.brokenAtSeq === 2 && v2.reason.includes("altered")) {
  console.log(`✓ Test 2 Passed: Payload edit caught at exactly row #${v2.brokenAtSeq}.`);
} else {
  console.error("✗ Test 2 Failed:", v2);
  allPassed = false;
}

// Test 3: Deleted row (row 2 removed)
const deletedRowChain = [cleanChain[0], cleanChain[2], cleanChain[3]];
const v3 = verifyChain(deletedRowChain);
if (!v3.ok) {
  console.log(`✓ Test 3 Passed: Deleted row caught at row #${v3.brokenAtSeq}.`);
} else {
  console.error("✗ Test 3 Failed:", v3);
  allPassed = false;
}

// Test 4: Inserted row
const insertedRowChain = [
  cleanChain[0],
  cleanChain[1],
  {
    updateId: "update-proof-01",
    seq: 3,
    at: "2026-10-29T10:00:03.000Z",
    actor: "attacker",
    type: "spoken",
    payload: { text: "Injected entry" },
    prevHash: cleanChain[1].hash,
    hash: "badhash",
  },
  cleanChain[2],
  cleanChain[3],
];
const v4 = verifyChain(insertedRowChain);
if (!v4.ok) {
  console.log(`✓ Test 4 Passed: Inserted row caught at row #${v4.brokenAtSeq}.`);
} else {
  console.error("✗ Test 4 Failed:", v4);
  allPassed = false;
}

// Test 5: Re-signed row (attacker updates row 2's hash, but row 3 prevHash doesn't match)
const resignedChain = JSON.parse(JSON.stringify(cleanChain));
resignedChain[1].payload = { factIds: ["f1"] };
resignedChain[1].hash = hashEntry(resignedChain[1], resignedChain[1].prevHash);
const v5 = verifyChain(resignedChain);
if (!v5.ok && v5.brokenAtSeq === 3) {
  console.log(`✓ Test 5 Passed: Re-signed predecessor caught at successor row #${v5.brokenAtSeq}.`);
} else {
  console.error("✗ Test 5 Failed:", v5);
  allPassed = false;
}

console.log("\nVerdict: " + (allPassed ? "ALL 5 TAMPER TESTS PASSED" : "FAILED"));
process.exit(allPassed ? 0 : 1);
