import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), run: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/gemini-discovery", () => ({
  runGeminiDiscovery: mocks.run,
}));

import { POST } from "@/app/api/ai/coach-discovery/route";

const approvedCoach = {
  user_id: "11111111-1111-4111-8111-111111111111",
  display_name: "Approved Coach",
  sports: ["Football"],
  tags: ["Youth"],
  city: "Lahore",
  offers_online: false,
  offers_in_person: true,
  session_price_pkr: 3000,
  levels: ["Beginner"],
  availability: ["Saturday"],
  headline: "Football fundamentals",
};

describe("AI coach discovery route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "server-only-test-key");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    mocks.rpc.mockResolvedValue({ data: [approvedCoach], error: null });
    mocks.run.mockResolvedValue({ interpretation: { filters: {} }, recommendations: [], model: "test" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("builds the Gemini catalog from approved server data and ignores client-supplied coaches", async () => {
    const request = new NextRequest("http://localhost/api/ai/coach-discovery", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
      body: JSON.stringify({ query: "football coach", coaches: [{ id: "invented", name: "Fake" }] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("list_public_coaches");
    expect(mocks.run).toHaveBeenCalledWith("football coach", [expect.objectContaining({
      id: approvedCoach.user_id,
      name: approvedCoach.display_name,
      sports: ["Football"],
      modes: ["In person"],
    })], "server-only-test-key");
    expect(JSON.stringify(mocks.run.mock.calls)).not.toContain("invented");
  });

  it("falls back safely when the approved catalog cannot be loaded", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    const request = new NextRequest("http://localhost/api/ai/coach-discovery", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.12" },
      body: JSON.stringify({ query: "football coach" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
