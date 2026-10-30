import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "../env";
import * as schema from "./schema";

/**
 * Database handle.
 *
 * Phase 1 runs entirely from fixtures and never touches this. From Phase 2 on,
 * DATABASE_URL is required. Constructed lazily so `npm run build` works without
 * a database — which matters, because the build must never need a secret.
 */

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | null = null;

export function db(): Db {
  if (!instance) {
    instance = drizzle(neon(env.databaseUrl), { schema });
  }
  return instance;
}

export { schema };

/** The dataset marker for the speaker's own data. Demo rows use a session id. */
export const REAL_DATASET = "real";

/**
 * Quality Lab runs. Kept apart from REAL_DATASET because /proof reads real use
 * from REAL_DATASET only, and a lab run replays golden cases that use the real
 * roster — filed as real, every benchmark would be counted as the speaker's
 * own work.
 */
export const LAB_DATASET = "lab";
