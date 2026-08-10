import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  applyCookies: vi.fn(<T>(response: T) => response),
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc },
    applyCookies: mocks.applyCookies,
  }),
}));

import { GET } from "@/app/api/schedule/route";

const bookingId = "33333333-3333-4333-8333-333333333333";
const userId = "11111111-1111-4111-8111-111111111111";

function request() {
  return new NextRequest("http://127.0.0.1:3000/api/schedule");
}

describe("participant schedule route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "list_my_coach_schedule") return Promise.resolve({
        data: [{
          booking_id: bookingId,
          slot_id: "22222222-2222-4222-8222-222222222222",
          coach_user_id: "44444444-4444-4444-8444-444444444444",
          athlete_user_id: userId,
          coach_name: "Coach One",
          athlete_name: "Ali Member",
          starts_at: "2026-08-08T10:00:00.000Z",
          ends_at: "2026-08-08T11:00:00.000Z",
          session_mode: "ONLINE",
          status: "COMPLETED",
          price_pkr: 5600,
        }],
        error: null,
      });
      if (name === "list_my_coach_slots") return Promise.resolve({ data: [], error: null });
      if (name === "list_my_coach_reviews") return Promise.resolve({
        data: [{ booking_id: bookingId, rating: 5, review_body: "Excellent coaching session.", created_at: "2026-08-08T12:00:00.000Z" }],
        error: null,
      });
      return Promise.resolve({ data: null, error: { message: "Unexpected RPC" } });
    });
  });

  it("maps a submitted review onto its booking so the review form stays locked", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.bookings).toContainEqual(expect.objectContaining({
      bookingId,
      reviewRating: 5,
      reviewBody: "Excellent coaching session.",
    }));
  });
});
