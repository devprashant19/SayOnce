import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { anthropic } from "./client";
import { env } from "../env";

/**
 * The only way SayOnce talks to a model.
 *
 * Every step returns JSON validated against a Zod schema. On an unusable
 * response we retry exactly once and then fail loudly with a message a person
 * can act on — never a silent empty result, because an empty fact list looks
 * like "nothing to say" and would quietly drop half an update.
 *
 * Note on determinism: `temperature` is not a parameter on the current models,
 * so repeatability comes from a frozen prompt, a strict schema and a fixed
 * effort level instead. That is why SAYONCE_GRADER_EFFORT exists and why it
 * must not move mid-build: Quality Lab runs are only comparable if the grader
 * is held still.
 */

export interface AiCallOptions<T extends z.ZodTypeAny> {
  /** Short step name used in errors and in the Trust Trail: "extract". */
  step: string;
  system: string;
  user: string;
  schema: T;
  maxTokens?: number;
  /** Overrides the global effort. The grader passes its own fixed level. */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
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

export async function aiCall<T extends z.ZodTypeAny>(
  options: AiCallOptions<T>,
): Promise<AiCallResult<z.infer<T>>> {
  const { step, system, user, schema, maxTokens = 16000 } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await anthropic().messages.parse({
        model: env.model,
        max_tokens: maxTokens,
        output_config: {
          effort: options.effort ?? env.effort,
          format: zodOutputFormat(schema),
        },
        system,
        messages: [
          {
            role: "user",
            content:
              attempt === 0
                ? user
                : `${user}\n\nYour previous response did not match the required schema. Return only valid JSON for the schema, with no commentary.`,
          },
        ],
      });

      if (response.stop_reason === "refusal") {
        throw new AiStepError(step, "the model declined this request");
      }

      const parsed = response.parsed_output;
      if (parsed === null || parsed === undefined) {
        throw new AiStepError(step, "the response did not match the schema");
      }

      return {
        value: parsed as z.infer<T>,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        retried: attempt > 0,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new AiStepError(
    step,
    "could not produce a valid result after one retry. Check the prompt and try again.",
    lastError,
  );
}
