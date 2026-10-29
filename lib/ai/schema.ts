import { z } from "zod";

/**
 * Zod -> Gemini JSON Schema.
 *
 * Gemini's `responseJsonSchema` constrains decoding, which is what makes every
 * pipeline step return parseable structure rather than prose. But it accepts
 * only a documented subset of JSON Schema, and Zod emits keywords outside it
 * (`pattern`, `default`, `minLength`, `propertyNames`, `$schema`, ...). Sending
 * one of those is a 400 on the first call of the run.
 *
 * So the schema is generated, then pruned to the supported subset. Zod still
 * validates the response afterwards, which is where the rules that cannot be
 * expressed to Gemini — the E.164 pattern, the ISO date shape, string lengths —
 * are actually enforced. The schema constrains the shape; Zod enforces the
 * contract.
 */

/**
 * Exactly the keywords Gemini documents for `responseJsonSchema`, plus its own
 * non-standard `propertyOrdering`. The test asserts nothing else survives.
 */
export const SUPPORTED_KEYWORDS = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);

/**
 * `format` is supported, but only for values Gemini recognises. An unknown
 * format is a silent behaviour change at best, so only these pass through.
 */
const SUPPORTED_FORMATS = new Set([
  "date-time",
  "date",
  "time",
  "duration",
  "email",
  "hostname",
  "uri",
  "uuid",
  "ipv4",
  "ipv6",
]);

type Json = Record<string, unknown>;

/**
 * Build a Gemini-safe schema for a Zod type.
 *
 * `io: "output"` matters: a field with `.default()` is guaranteed present in
 * the parsed output, so it should be required in the schema the model is
 * decoding against. Asking the model for an optional field and then relying on
 * a default is how half an update goes missing.
 */
export function geminiSchema(schema: z.ZodType): Json {
  const generated = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "output",
    // A type Zod cannot express in JSON Schema becomes an unconstrained value
    // rather than throwing at startup. Zod still validates it on the way back.
    unrepresentable: "any",
    // Inline everything. $ref is supported only in narrow positions, and a
    // flat schema is one less thing that can be rejected.
    reused: "inline",
  }) as Json;

  const pruned = prune(generated);
  if (!isObject(pruned)) {
    throw new Error("A pipeline step's schema must be a JSON object schema.");
  }
  return pruned;
}

function prune(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(prune);
  if (!isObject(node)) return node;

  const out: Json = {};

  for (const [key, value] of Object.entries(node)) {
    if (!SUPPORTED_KEYWORDS.has(key)) continue;

    switch (key) {
      case "format":
        if (typeof value === "string" && SUPPORTED_FORMATS.has(value)) {
          out.format = value;
        }
        break;

      case "properties": {
        if (!isObject(value)) break;
        const properties: Json = {};
        for (const [name, child] of Object.entries(value)) {
          properties[name] = prune(child);
        }
        out.properties = properties;
        // Supported and non-standard: it asks the model to emit keys in a
        // stable order, which makes two runs over the same input easier to
        // diff — worth having on a pipeline we grade run against run.
        out.propertyOrdering = Object.keys(properties);
        break;
      }

      case "additionalProperties":
        // Either a boolean, or a schema (a Zod record's value type).
        out.additionalProperties = typeof value === "boolean" ? value : prune(value);
        break;

      case "items":
      case "prefixItems":
      case "anyOf":
      case "oneOf":
      case "$defs":
        out[key] = prune(value);
        break;

      case "type":
        // Zod writes a nullable field as `type: ["string", "null"]`. Gemini
        // follows the OpenAPI subset, which expects a single type, so express
        // the union the way it does understand.
        if (Array.isArray(value)) {
          const types = value.filter((t): t is string => typeof t === "string");
          if (types.length === 1) {
            out.type = types[0];
          } else {
            out.anyOf = types.map((t) => ({ type: t }));
          }
        } else {
          out.type = value;
        }
        break;

      default:
        out[key] = value;
    }
  }

  // A `required` list must not name a property that was pruned away.
  if (Array.isArray(out.required) && isObject(out.properties)) {
    const present = new Set(Object.keys(out.properties));
    out.required = out.required.filter((name) => typeof name === "string" && present.has(name));
    if ((out.required as string[]).length === 0) delete out.required;
  }

  // Gemini rejects an object schema with no properties. That only happens for
  // a genuinely unconstrained value, which is better expressed as "any".
  if (out.type === "object" && !isObject(out.properties) && !("additionalProperties" in out)) {
    delete out.type;
  }

  // `anyOf` produced from a type union cannot also carry a sibling `type`.
  if (Array.isArray(out.anyOf) && "type" in out) delete out.type;

  return out;
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every keyword appearing anywhere in a schema. Used by the test. */
export function keywordsIn(node: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) keywordsIn(item, found);
    return found;
  }
  if (!isObject(node)) return found;

  for (const [key, value] of Object.entries(node)) {
    found.add(key);
    // Property *names* are data, not keywords, so recurse past them.
    if (key === "properties" && isObject(value)) {
      for (const child of Object.values(value)) keywordsIn(child, found);
    } else {
      keywordsIn(value, found);
    }
  }
  return found;
}
