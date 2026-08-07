import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const approvedCoach = {
  user_id: "11111111-1111-4111-8111-111111111111",
  display_name: "Approved Coach",
  sports: ["Football"], tags: ["Youth"], city: "Lahore",
  offers_online: false, offers_in_person: true, session_price_pkr: 3000,
  levels: ["Beginner"], availability: ["Saturday"], headline: "Football fundamentals",
};
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), run: vi.fn(), getUser: vi.fn(), profileSingle: vi.fn() }));
vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc, from: () => ({ select: () => ({ eq: () => ({ single: mocks.profileSingle }) }) }) },
    applyCookies: <T,>(response: T) => response,
  }),
}));
vi.mock("@/lib/gemini-discovery", () => ({ runGeminiDiscovery: mocks.run }));
import { POST } from "@/app/api/ai/coach-discovery/route";

function request(body: unknown, contentType = "application/json") {
  return new NextRequest("http://localhost/api/ai/coach-discovery", {
    method: "POST", headers: { "content-type": contentType }, body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("AI coach discovery route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "server-only-test-key");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "member-1" } }, error: null });
    mocks.rpc.mockImplementation(async (name: string) => name === "consume_ai_discovery_quota"
      ? { data: true, error: null } : { data: [approvedCoach], error: null });
    mocks.profileSingle.mockResolvedValue({ data: { interests: ["Football"], preferred_location: "Lahore", max_budget_pkr: 3500, training_goal: "Improve control", experience_level: "Beginner" }, error: null });
    mocks.run.mockResolvedValue({ interpretation: { filters: {} }, recommendations: [], model: "test" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("requires an authenticated member before spending an AI request", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(request({ query: "football coach" }));
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("uses a shared database quota and authoritative approved catalog", async () => {
    const response = await POST(request({ query: "football coach", coaches: [{ id: "invented", name: "Fake" }] }));
    expect(response.status).toBe(200);
    expect(mocks.rpc.mock.calls.map((call) => call[0])).toEqual(["consume_ai_discovery_quota", "list_public_coaches"]);
    expect(mocks.run).toHaveBeenCalledWith("football coach", [expect.objectContaining({
      id: approvedCoach.user_id, name: approvedCoach.display_name, sports: ["Football"], modes: ["In person"],
    })], "server-only-test-key", fetch, expect.objectContaining({ interests: ["Football"], location: "Lahore", maxBudgetPkr: 3500 }));
    expect(JSON.stringify(mocks.run.mock.calls)).not.toContain("invented");
  });

  it("enforces quota and actual body bytes", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await POST(request({ query: "football coach" }))).status).toBe(429);
    expect((await POST(request(JSON.stringify({ query: "é".repeat(2100) })))).status).toBe(413);
  });

  it("rejects non-JSON and catalog outages safely", async () => {
    expect((await POST(request("query=football", "text/plain"))).status).toBe(415);
    mocks.rpc.mockImplementation(async (name: string) => name === "consume_ai_discovery_quota"
      ? { data: true, error: null } : { data: null, error: { message: "unavailable" } });
    expect((await POST(request({ query: "football coach" }))).status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
