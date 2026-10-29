import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The live suite: real model calls, opt-in, run with `npm run test:live`.
 * Kept in its own config so the offline suite can never accidentally bill you.
 */
export default defineConfig({
  test: {
    include: ["tests/live/**/*.live.test.ts"],
    environment: "node",
    // Reads .env.local, which vitest does not do on its own.
    setupFiles: ["./tests/stubs/load-env.ts"],
    // One model call at a time, so a rate limit does not look like a bug.
    fileParallelism: false,
    testTimeout: 180_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
});
