import { describe, it, expect, vi, afterEach } from "vitest";
import { datasetFor } from "@/lib/dataset";
import { LAB_DATASET, REAL_DATASET } from "@/lib/db";
import { POST } from "@/app/api/fanout/route";
import * as updateRepo from "@/lib/update-repo";

/**
 * /proof reports REAL_DATASET as the speaker's own use. Golden cases replay
 * through the real roster, so before lab traffic was tagged, every Quality Lab
 * run was filed as real: a local store reached "65 real updates" without one
 * real update in it.
 */
describe("which dataset an update is filed under", () => {
  it("files lab traffic as lab, even on the real roster", () => {
    expect(datasetFor({ source: "lab", contactSet: "freelance" })).toBe(LAB_DATASET);
    expect(datasetFor({ source: "lab", contactSet: "india", demoSessionId: "s1" })).toBe(LAB_DATASET);
  });

  it("files a person using the real roster as real use", () => {
    expect(datasetFor({ source: "app", contactSet: "freelance" })).toBe(REAL_DATASET);
  });

  it("files a judge's demo session under that session, never as real", () => {
    expect(datasetFor({ source: "app", contactSet: "india", demoSessionId: "abc" })).toBe("demo_abc");
    expect(datasetFor({ source: "app", contactSet: "global" })).toBe("global");
  });
});

describe("the fan-out route honours the source", () => {
  afterEach(() => vi.restoreAllMocks());

  async function savedDatasetFor(body: Record<string, unknown>) {
    const save = vi.spyOn(updateRepo, "saveFanoutRecord").mockResolvedValue(undefined as never);
    const response = await POST(
      new Request("http://localhost:3000/api/fanout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ demoId: "demo_in_1", spokenText: "x", ...body }),
      }),
    );
    expect(response.status).toBe(200);
    expect(save).toHaveBeenCalledTimes(1);
    return save.mock.calls[0]![0].dataset;
  }

  it("keeps a Quality Lab run out of real use", async () => {
    expect(await savedDatasetFor({ contactSet: "freelance", source: "lab" })).toBe(LAB_DATASET);
  });

  it("still records genuine use of the real roster as real", async () => {
    expect(await savedDatasetFor({ contactSet: "freelance" })).toBe(REAL_DATASET);
  });
});
