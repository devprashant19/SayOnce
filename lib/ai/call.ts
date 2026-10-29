import "server-only";
import type { z } from "zod";
import { gemini } from "./client";
import { geminiSchema } from "./schema";
import { env } from "../env";

/**
 * The only way SayOnce talks to a model.
 *
 * Every step returns JSON that is constrained by a schema on the way out and
 * validated by Zod on the way back. On an unusable response we retry exactly
 * once, with the validation errors stated, and then fail loudly with a message
 * a person can act on — never a silent empty result, because an empty fact list
 * looks like "nothing to say" and would quietly drop half an update.
 *
 * On determinism: Gemini accepts `temperature`, so the grader runs at 0 and the
 * pipeline runs low. Two Quality Lab runs over the same golden set are then
 * comparable, which is the whole point of having a lab. Record the model and
 * the temperature with every run (`lab_runs`) so a score is never compared
 * across configurations by accident.
 */

export interface AiCallOptions<T extends z.ZodType> {
  /** Short step name used in errors and in the Trust Trail: "extract". */
  step: string;
  system: string;
  user: string;
  schema: T;
  maxOutputTokens?: number;
  /** Overrides the global temperature. The grader passes 0. */
  temperature?: number;
  /**
   * Reasoning depth. Omitted uses the configured default. Pass 0 to turn
   * thinking off on a step that does not need it (note that gemini-2.5-pro
   * cannot turn it off and has a minimum of 128).
   */
  thinkingBudget?: number;
}

export interface AiCallResult<T> {
  value: T;
  usage: { inputTokens: number; outputTokens: number };
  /** True when the first attempt came back unusable and we retried. */
  retried: boolean;
}

export class AiStepError extends Error {
  readonly step: string;

  constructor(step: string, message: string, cause?: unknown) {
    super(`${step}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "AiStepError";
    this.step = step;
  }
}

export async function aiCall<T extends z.ZodType>(
  options: AiCallOptions<T>,
): Promise<AiCallResult<z.infer<T>>> {
  const { step, system, user, schema, maxOutputTokens = 16000 } = options;

  const responseJsonSchema = geminiSchema(schema);
  const temperature = options.temperature ?? env.temperature;
  const thinkingBudget = options.thinkingBudget ?? env.thinkingBudget;

  let lastError: unknown = null;
  let lastRawText = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await gemini().models.generateContent({
        model: env.model,
        contents:
          attempt === 0
            ? user
            : lastRawText
              ? `${user}\n\nYour previous response could not be used:\n${describe(lastError)}\n\nReturn only JSON matching the required schema, with no commentary.`
              : user,
        config: {
          systemInstruction: system,
          temperature,
          maxOutputTokens,
          responseMimeType: "application/json",
          responseJsonSchema,
          // Thinking is what gets the hard cases right — a mid-sentence
          // correction, a relative date, who a privacy instruction meant. Only
          // the 2.5 and 3 series accept it, so it is omitted otherwise.
          ...(thinkingBudget === null ? {} : { thinkingConfig: { thinkingBudget } }),
        },
      });

      const text = response.text;
      lastRawText = text ?? "";

      if (!text || text.trim().length === 0) {
        // An empty body usually means the output cap was hit or the response
        // was blocked. Say which, so it is not mistaken for "nothing to say".
        const reason = response.candidates?.[0]?.finishReason;
        throw new AiStepError(
          step,
          reason
            ? `the model returned nothing (finish reason: ${reason})`
            : "the model returned nothing",
        );
      }

      const parsed = schema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        throw new AiStepError(step, `the response did not match the schema: ${summarise(parsed.error)}`);
      }

      return {
        value: parsed.data as z.infer<T>,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
        retried: attempt > 0,
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        const isUnavailable =
          (error as { status?: number })?.status === 503 ||
          (error as { status?: number })?.status === 429 ||
          String(error).includes("503") ||
          String(error).includes("UNAVAILABLE") ||
          String(error).includes("high demand");
        const delayMs = isUnavailable ? 5000 : 2000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new AiStepError(
    step,
    `could not produce a valid result after one retry. ${describe(lastError)}` +
      (lastRawText ? ` Last response began: ${lastRawText.slice(0, 160)}` : ""),
    lastError,
  );
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error.";
}

/** The first few Zod issues, with their paths, so a failure names a field. */
function summarise(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}
