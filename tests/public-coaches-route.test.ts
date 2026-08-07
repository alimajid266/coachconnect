import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createSignedUrl: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: mocks.rpc,
    storage: { from: () => ({ createSignedUrl: mocks.createSignedUrl }) },
  }),
}));

import { GET } from "@/app/api/coaches/route";

describe("public coaches route", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "public-key");
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.supabase.co/storage/v1/object/sign/coach-profile-images/signed-image" },
      error: null,
    });
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === "list_public_coaches" ? {
      data: [{
        user_id: "coach-1",
        display_name: "Ali Coach",
        headline: "Patient tennis coaching",
        bio: "Structured coaching for adults who want dependable technique and confidence.",
        sports: ["Tennis", "Squash"],
        tags: ["Beginners", "Match preparation"],
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
        public_longitude: 73.08,
        public_latitude: 33.65,
        profile_image_path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
        availability: ["Saturday"],
        faqs: [{ question: "What should I bring?", answer: "Comfortable sportswear and water." }],
      }],
      error: null,
    } : { data: [], error: null }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns approved database coaches in the public catalog shape", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("list_public_coaches");
    expect(mocks.rpc).toHaveBeenCalledWith("list_demo_coaches");
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({
      coaches: [expect.objectContaining({
        id: "coach-1",
        name: "Ali Coach",
        location: "Rawalpindi",
        area: "Ayub Park",
        sports: ["Tennis", "Squash"],
        tags: ["Beginners", "Match preparation"],
        specialty: "Patient tennis coaching",
        price: 3500,
        mode: "In person + Online",
        offersOnline: true,
        offersInPerson: true,
        rating: null,
        coordinates: [73.08, 33.65],
        image: "https://example.supabase.co/storage/v1/object/sign/coach-profile-images/signed-image",
      })],
      demos: [],
      demosAvailable: true,
    });
  });

  it("does not leak private or moderation fields", async () => {
    const response = await GET();
    const body = JSON.stringify(await response.json());

    expect(body).not.toMatch(/email|reviewNote|reviewedBy/i);
  });

  it("uses the member avatar when a coach has no gallery or cover image", async () => {
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === "list_public_coaches" ? {
      data: [{
        user_id: "coach-avatar",
        display_name: "Avatar Coach",
        headline: "Football coaching",
        bio: "Structured coaching sessions for developing football players.",
        sports: ["Football"],
        session_price_pkr: 3000,
        offers_online: true,
        offers_in_person: false,
        avatar_path: "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.webp",
      }],
      error: null,
    } : { data: [], error: null }));

    const response = await GET();
    const body = await response.json();

    expect(body.coaches[0]).toMatchObject({
      avatar: "https://example.supabase.co/storage/v1/object/sign/coach-profile-images/signed-image",
      image: "https://example.supabase.co/storage/v1/object/sign/coach-profile-images/signed-image",
    });
  });

  it("maps durable demo languages, coaching style, and pipe-delimited lesson steps", async () => {
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === "list_public_coaches"
      ? { data: [], error: null }
      : {
        data: [{
          profile_id: "demo-one",
          is_demo: true,
          display_name: "Demo Coach",
          headline: "Illustrative cricket coaching",
          bio: "An illustrative profile used to explain the marketplace.",
          sports: ["Cricket"],
          tags: ["Beginner friendly"],
          experience_years: 5,
          session_price_pkr: 2500,
          offers_online: true,
          offers_in_person: false,
          availability: ["Saturday"],
          audiences: ["Adults"],
          levels: ["Beginner"],
          lesson_plan: "Warm-up|Focused drill|Next steps",
          languages: "English|Urdu",
          coaching_style: "Patient and structured.",
        }],
        error: null,
      }));

    const response = await GET();
    const body = await response.json();

    expect(body.demosAvailable).toBe(true);
    expect(body.demos[0]).toMatchObject({
      languages: ["English", "Urdu"],
      coachingStyle: "Patient and structured.",
      image: "/images/coach-ayesha.jpg",
      lessonPlan: [
        { title: "Step 1", description: "Warm-up" },
        { title: "Step 2", description: "Focused drill" },
        { title: "Step 3", description: "Next steps" },
      ],
    });
  });

  it("fails closed when the public database projection is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("missing function") });

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Approved coaches are temporarily unavailable." });
  });
});
