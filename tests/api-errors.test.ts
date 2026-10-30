import { describe, it, expect, vi, afterEach } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as contactRepo from "@/lib/contact-repo";
import { GET } from "@/app/api/contacts/route";

/**
 * Production /api/contacts answered every roster with
 * {"error":"ENOENT: no such file or directory, mkdir '/var/task/data/store'"}:
 * a server path sent to the page, and /people showing "0 contacts" for the
 * demo teams too. Routes that call the model could have sent provider text —
 * quota messages, URLs — the same way.
 */
describe("API routes never send raw error text to the page", () => {
  function routeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? routeFiles(full) : name === "route.ts" ? [full] : [];
    });
  }

  it("no route returns an exception's message in its JSON", () => {
    const offenders = routeFiles(join(process.cwd(), "app", "api"))
      // The Quality Lab is a developer tool, refused on the shared host; its
      // per-case detail is for the person running it.
      .filter((f) => !/[\\/]api[\\/]lab[\\/]/.test(f))
      .filter((f) =>
        /error:\s*(err|error|e)\s*instanceof Error\s*\?\s*(err|error|e)\.message/.test(
          readFileSync(f, "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});

describe("contacts fall back to the bundled roster", () => {
  afterEach(() => vi.restoreAllMocks());

  const failingRead = () =>
    vi
      .spyOn(contactRepo, "listContacts")
      .mockRejectedValue(new Error("ENOENT: no such file or directory, mkdir '/var/task/data/store'"));

  it("shows a demo team even when the store cannot be read, and leaks nothing", async () => {
    failingRead();
    const response = await GET(new Request("http://localhost/api/contacts?dataset=india"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("bundled");
    expect(body.contacts.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toMatch(/ENOENT|\/var\/task|mkdir/);
  });

  it("uses the same roster as the fan-out for the real dataset", async () => {
    vi.spyOn(contactRepo, "listContacts").mockResolvedValue([]);
    const body = await (await GET(new Request("http://localhost/api/contacts?dataset=real"))).json();
    expect(body.source).toBe("bundled");
    expect(body.contacts.length).toBeGreaterThan(0);
  });

  it("answers an unknown roster it cannot read with a plain message", async () => {
    failingRead();
    const response = await GET(new Request("http://localhost/api/contacts?dataset=nobody"));
    expect(response.status).toBe(500);
    const raw = JSON.stringify(await response.json());
    expect(raw).toContain("Contacts could not be loaded.");
    expect(raw).not.toMatch(/ENOENT|\/var\/task|mkdir/);
  });
});
