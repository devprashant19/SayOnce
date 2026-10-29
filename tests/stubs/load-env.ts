import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Load .env.local into process.env for the live suite.
 *
 * Vitest does not do this: Vite's env handling is for client-side VITE_ vars,
 * not process.env in a node test. Rather than require everyone to export the
 * key by hand, read the same file `npm run dev` reads.
 *
 * Existing environment variables win, so CI can override the file.
 */
const root = fileURLToPath(new URL("../../", import.meta.url));

for (const name of [".env.local", ".env"]) {
  const path = `${root}${name}`;
  if (!existsSync(path)) continue;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value.length > 0 && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
