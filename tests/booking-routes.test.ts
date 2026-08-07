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

import { POST } from "@/app/api/bookings/route";
import { PATCH } from "@/app/api/bookings/[id]/route";
import { DELETE as DELETE_SLOT, POST as POST_SLOT } from "@/app/api/schedule/slots/route";

const bookingId = "33333333-3333-4333-8333-333333333333";
const slotId = "22222222-2222-4222-8222-222222222222";

function post(body: unknown, origin?: string) {
  return new NextRequest("http://127.0.0.1:3000/api/bookings", {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });
}

function patch(body: unknown, id = bookingId) {
  return PATCH(new NextRequest(`http://127.0.0.1:3000/api/bookings/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ id }) });
}

describe("booking mutation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyCookies.mockImplementation(<T>(response: T) => response);
    mocks.getUser.mockResolvedValue({ data: { user: { id: "member-1" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: { id: bookingId }, error: null });
  });

  it("rejects cross-origin booking requests before authentication", async () => {
    const response = await POST(post({ slotId }, "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("rejects malformed slot and booking identifiers before PostgreSQL", async () => {
    const createResponse = await POST(post({ slotId: "not-a-uuid" }));
    const changeResponse = await patch({ action: "cancel" }, "not-a-uuid");
    expect(createResponse.status).toBe(400);
    expect(changeResponse.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed slot deletion identifier before PostgreSQL", async () => {
    const response = await DELETE_SLOT(new NextRequest("http://127.0.0.1:3000/api/schedule/slots", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slotId: "not-a-uuid" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires authentication for booking transitions", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await patch({ action: "cancel" });
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("explains why an approved coach availability slot was rejected", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Choose a valid future slot" } });
    const response = await POST_SLOT(new NextRequest("http://127.0.0.1:3000/api/schedule/slots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        startsAt: "2099-08-14T10:00:00.000Z",
        endsAt: "2099-08-14T11:00:00.000Z",
        mode: "IN_PERSON",
        sessionMinutes: 60,
      }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Choose a future start time at least 30 minutes from now, lasting 30 minutes to 3 hours.",
    });
  });

  it("sends bounded meeting details through the protected coach RPC", async () => {
    const details = "Meet beside the F-7 community court gate.";
    const response = await patch({ action: "meeting-details", meetingDetails: details });
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("set_coach_booking_meeting_details", {
      target_booking_id: bookingId,
      requested_details: details,
    });
  });

  it("records only a demo-payment action and never accepts card data", async () => {
    const response = await patch({ action: "demo-payment" });
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("record_demo_booking_payment", { target_booking_id: bookingId });
  });
});
