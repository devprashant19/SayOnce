#!/usr/bin/env node
/**
 * Five-second check that the AI side is alive.
 *
 *   npm run smoke:ai
 *
 * Answers one question: is the key valid, is the model reachable, and does
 * schema-constrained JSON come back? It deliberately does not touch the
 * SayOnce pipeline — when something is wrong, you want to know which half.
 *
 * For the real end-to-end test of the pipeline itself, use `npm run test:live`.
 */

import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const model = process.env.SAYONCE_MODEL ?? "gemini-2.5-flash";

if (!key) {
  console.error(
    "GEMINI_API_KEY is not set.\n\n" +
      "  1. Get a free key: https://aistudio.google.com/apikey\n" +
      "  2. cp .env.example .env.local\n" +
      "  3. Paste it as GEMINI_API_KEY=...\n",
  );
  process.exit(1);
}

console.log(`model: ${model}`);
console.log(`key:   ${key.slice(0, 6)}… (${key.length} chars)\n`);

// A miniature of what Extract does: a Hindi numeral and a relative date out of
// code-mixed speech, with the shape pinned by a schema.
const schema = {
  type: "object",
  properties: {
    quantity: { type: "integer", description: "The number of cartons mentioned." },
    dayName: { type: "string", description: "The weekday mentioned, in English." },
    language: { type: "string", description: "The languages the speaker mixed." },
  },
  propertyOrdering: ["quantity", "dayName", "language"],
  required: ["quantity", "dayName", "language"],
};

const ai = new GoogleGenAI({ apiKey: key });
const started = Date.now();

try {
  const response = await ai.models.generateContent({
    model,
    contents: "Ramesh ne dhai sau cartons bheje, aur delivery Monday ho gayi hai.",
    config: {
      systemInstruction:
        "Read the code-mixed speech and return the structured facts. " +
        "Convert numerals spoken in Hindi to digits.",
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  });

  const elapsed = Date.now() - started;
  const text = response.text;

  if (!text) {
    const reason = response.candidates?.[0]?.finishReason ?? "unknown";
    console.error(`FAIL: the model returned nothing (finish reason: ${reason})`);
    process.exit(1);
  }

  const parsed = JSON.parse(text);
  console.log("structured response:", JSON.stringify(parsed));
  console.log(
    `tokens: ${response.usageMetadata?.promptTokenCount ?? "?"} in, ` +
      `${response.usageMetadata?.candidatesTokenCount ?? "?"} out`,
  );
  console.log(`latency: ${elapsed} ms\n`);

  // "dhai sau" is 250. If this is wrong the key works but the model is not
  // reading Hinglish numerals, which is worth knowing before Phase 1.
  const checks = [
    ["returned valid JSON matching the schema", typeof parsed.quantity === "number"],
    ["converted 'dhai sau' to 250", parsed.quantity === 250],
    ["read the weekday", String(parsed.dayName ?? "").toLowerCase().includes("monday")],
  ];

  let ok = true;
  for (const [label, passed] of checks) {
    console.log(`  ${passed ? "pass" : "FAIL"}  ${label}`);
    if (!passed) ok = false;
  }

  if (!ok) {
    console.error(
      "\nThe connection works but the model misread the input. Try " +
        "SAYONCE_MODEL=gemini-2.5-pro, which is stronger on code-mixed speech.",
    );
    process.exit(1);
  }

  console.log("\nAI side is working. Next: npm run test:live");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: ${message}\n`);

  if (/API[_ ]?key not valid|API_KEY_INVALID|400/i.test(message)) {
    console.error("That key was rejected. Check it at https://aistudio.google.com/apikey");
  } else if (/404|not found|NOT_FOUND/i.test(message)) {
    console.error(
      `The model "${model}" was not found for this key. Try SAYONCE_MODEL=gemini-2.5-flash.`,
    );
  } else if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    console.error("Rate limited or out of quota. Wait a minute, or check your AI Studio quota.");
  } else if (/fetch failed|ENOTFOUND|ETIMEDOUT/i.test(message)) {
    console.error("Could not reach the API. Check your network or proxy.");
  }
  process.exit(1);
}
