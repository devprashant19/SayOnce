/**
 * In Next's server runtime the `server-only` package resolves to an empty
 * module (the `react-server` export condition); outside it, importing it
 * throws, which is exactly what stops a client component from pulling in a
 * secret.
 *
 * Vitest resolves the throwing entry, so server modules could not be tested at
 * all. Aliasing it here reproduces the server condition and nothing more — the
 * real guarantee is enforced at build time by Next, which this does not touch.
 */
export {};
