import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));

import { GET } from "@/app/api/coaches/route";

describe("public coaches route", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-key");
    mocks.rpc.mockResolvedValue({
      data: [{
        user_id: "coach-1",
        display_name: "Ali Coach",
        headline: "Patient tennis coaching",
        bio: "Structured coaching for adults who want dependable technique and confidence.",
        sports: ["Tennis"],
        experience_years: 5,
        qualifications: "Certified tennis coach",
        audiences: ["Adults"],
        levels: ["Beginner"],
        lesson_plan: "Warm-up, focused technique, guided play and clear feedback.",
        session_price_pkr: 3500,
        offers_online: true,
        offers_in_person: true,
        city: "Rawalpindi",
        public_area: "Ayub Park",
        availability: ["Saturday"],
        faqs: [{ question: "What should I bring?", answer: "Comfortable sportswear and water." }],
      }],
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns approved database coaches in the public catalog shape", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("list_public_coaches");
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({
      coaches: [expect.objectContaining({
        id: "coach-1",
        name: "Ali Coach",
        location: "Rawalpindi",
        area: "Ayub Park",
        sports: ["Tennis"],
        specialty: "Patient tennis coaching",
        price: 3500,
        mode: "In person + Online",
        offersOnline: true,
        offersInPerson: true,
        rating: null,
        image: null,
      })],
    });
  });

  it("does not leak private or moderation fields", async () => {
    const response = await GET();
    const body = JSON.stringify(await response.json());

    expect(body).not.toMatch(/email|reviewNote|reviewedBy/i);
  });

  it("fails closed when the public database projection is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("missing function") });

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Approved coaches are temporarily unavailable." });
  });
});
