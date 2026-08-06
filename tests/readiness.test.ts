import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));

import { GET } from "@/app/api/ready/route";

const originalEnv = { ...process.env };

describe("readiness endpoint", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    mocks.rpc.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports ready only when the required public database function responds", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ service: "coachconnect", status: "ready" });
    expect(mocks.rpc).toHaveBeenCalledWith("list_public_coaches");
  });

  it("reports unavailable when Supabase cannot serve the catalog", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ service: "coachconnect", status: "unavailable" });
  });
});
