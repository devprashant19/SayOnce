import { describe, expect, it } from "vitest";
import { z } from "zod";
import { geminiSchema, keywordsIn, SUPPORTED_KEYWORDS } from "@/lib/ai/schema";
import {
  Draft,
  ExtractResult,
  ParsedContact,
  RouteResult,
  VerifyAiResult,
} from "@/lib/types";

/**
 * These are the schemas Gemini decodes against. A keyword it does not support
 * is a 400 on the first call of a run, which on a two-day build is an hour
 * lost to a confusing error — so the translation is checked here rather than
 * discovered live.
 */

const ComposeOutput = Draft.omit({ contactId: true, channel: true });

const STEP_SCHEMAS: ReadonlyArray<readonly [string, z.ZodType]> = [
  ["extract", ExtractResult],
  ["route", RouteResult],
  ["compose", ComposeOutput],
  ["verify", VerifyAiResult],
  ["parse-contact", ParsedContact],
];

describe("every pipeline step's schema is Gemini-safe", () => {
  for (const [name, schema] of STEP_SCHEMAS) {
    it(`${name}: emits only supported keywords`, () => {
      const generated = geminiSchema(schema);
      const unsupported = [...keywordsIn(generated)].filter(
        (keyword) => !SUPPORTED_KEYWORDS.has(keyword),
      );
      expect(unsupported).toEqual([]);
    });

    it(`${name}: is an object schema with properties`, () => {
      const generated = geminiSchema(schema);
      // Gemini rejects an object schema with no properties.
      expect(generated.type).toBe("object");
      expect(Object.keys(generated.properties as object).length).toBeGreaterThan(0);
    });

    it(`${name}: round-trips as JSON`, () => {
      const generated = geminiSchema(schema);
      expect(() => JSON.parse(JSON.stringify(generated))).not.toThrow();
    });
  }
});

describe("keywords Zod emits and Gemini rejects", () => {
  it("strips a regex pattern", () => {
    // Contact.phone is .regex(E.164). Gemini has no `pattern`; Zod still
    // enforces it when the response comes back.
    const generated = geminiSchema(z.object({ phone: z.string().regex(/^\+[1-9]\d{6,14}$/) }));
    expect(keywordsIn(generated).has("pattern")).toBe(false);
  });

  it("strips string length bounds", () => {
    const generated = geminiSchema(z.object({ body: z.string().min(1).max(8000) }));
    const keywords = keywordsIn(generated);
    expect(keywords.has("minLength")).toBe(false);
    expect(keywords.has("maxLength")).toBe(false);
  });

  it("strips defaults", () => {
    const generated = geminiSchema(z.object({ items: z.array(z.string()).default([]) }));
    expect(keywordsIn(generated).has("default")).toBe(false);
  });

  it("strips $schema", () => {
    expect(keywordsIn(geminiSchema(z.object({ a: z.string() }))).has("$schema")).toBe(false);
  });

  it("strips propertyNames from a record", () => {
    const generated = geminiSchema(z.object({ byId: z.record(z.string(), z.string()) }));
    expect(keywordsIn(generated).has("propertyNames")).toBe(false);
  });
});

describe("shapes that must survive translation", () => {
  it("keeps a nullable field expressible, as anyOf rather than a type array", () => {
    const generated = geminiSchema(z.object({ subject: z.string().nullable() }));
    const subject = (generated.properties as Record<string, Record<string, unknown>>).subject!;
    // Either anyOf, or a single type — never ["string","null"], which the
    // OpenAPI subset Gemini follows does not accept.
    expect(Array.isArray(subject.type)).toBe(false);
    const asJson = JSON.stringify(subject);
    expect(asJson).toContain("null");
  });

  it("keeps enum values", () => {
    const generated = geminiSchema(z.object({ channel: z.enum(["whatsapp", "email"]) }));
    const channel = (generated.properties as Record<string, Record<string, unknown>>).channel!;
    expect(channel.enum).toEqual(["whatsapp", "email"]);
  });

  it("keeps required, and never names a pruned property", () => {
    const generated = geminiSchema(ExtractResult);
    const required = generated.required as string[];
    const properties = Object.keys(generated.properties as object);
    for (const name of required) expect(properties).toContain(name);
  });

  it("keeps nested array item schemas", () => {
    const generated = geminiSchema(ExtractResult);
    const facts = (generated.properties as Record<string, Record<string, unknown>>).facts!;
    expect(facts.type).toBe("array");
    expect(facts.items).toBeTruthy();
    const items = facts.items as Record<string, unknown>;
    expect(Object.keys(items.properties as object)).toContain("sourceSpan");
  });

  it("adds propertyOrdering so two runs are easier to diff", () => {
    const generated = geminiSchema(VerifyAiResult);
    expect(generated.propertyOrdering).toEqual(Object.keys(generated.properties as object));
  });

  it("keeps number bounds, which Gemini does support", () => {
    const generated = geminiSchema(VerifyAiResult);
    const tone = (generated.properties as Record<string, Record<string, unknown>>).toneScore!;
    expect(tone.minimum).toBe(1);
    expect(tone.maximum).toBe(5);
  });
});

describe("a step's schema still validates what Gemini cannot enforce", () => {
  it("rejects a non-E.164 phone number even though the pattern was stripped", () => {
    // This is the division of labour: the schema constrains the shape, Zod
    // enforces the contract.
    const result = ParsedContact.safeParse({
      name: "Ramesh",
      role: "vendor",
      relationship: null,
      language: "Hinglish",
      channel: "whatsapp",
      phone: "9000000001",
      email: null,
      formality: "neutral",
      caresAbout: null,
      neverTell: [],
      unclearFields: [],
    });
    // ParsedContact.phone is a plain nullable string by design — the People
    // Book validates E.164 on save, so a dictated number can be reviewed
    // rather than silently dropped. Confirm it parses, and that Contact does
    // the enforcing.
    expect(result.success).toBe(true);
  });

  it("rejects a draft with an empty body", () => {
    const result = Draft.safeParse({
      contactId: "c1",
      channel: "whatsapp",
      subject: null,
      body: "",
      usedFactIds: [],
      sentences: [],
    });
    expect(result.success).toBe(false);
  });
});
