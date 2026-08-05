import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileSingle: vi.fn(),
  applicationsNeq: vi.fn(),
  applicationsOrder: vi.fn(),
  rpc: vi.fn(),
  applyCookies: vi.fn(<T>(response: T) => response),
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: {
      auth: { getUser: mocks.getUser },
      from: (table: string) => table === "profiles"
        ? { select: () => ({ eq: () => ({ single: mocks.profileSingle }) }) }
        : { select: () => ({ neq: mocks.applicationsNeq }) },
      rpc: mocks.rpc,
    },
    applyCookies: mocks.applyCookies,
  }),
}));

import { GET as listApplications, PATCH as reviewApplication } from "@/app/api/admin/coach-applications/route";

function request() {
  return new NextRequest("http://127.0.0.1:3000/api/admin/coach-applications");
}

function reviewRequest(body: unknown) {
  return new NextRequest("http://127.0.0.1:3000/api/admin/coach-applications", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("administrator coach application routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyCookies.mockImplementation(<T>(response: T) => response);
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mocks.profileSingle.mockResolvedValue({ data: { role: "ADMIN" }, error: null });
    mocks.applicationsNeq.mockReturnValue({ order: mocks.applicationsOrder });
  });

  it("lists submitted coach applications with applicant names for administrators", async () => {
    mocks.applicationsOrder.mockResolvedValue({
      data: [{
        user_id: "member-1",
        status: "SUBMITTED",
        headline: "Tennis coach for confident match play",
        submitted_at: "2026-08-05T10:30:00Z",
        profiles: { display_name: "Ayesha Khan" },
      }],
      error: null,
    });

    const response = await listApplications(request());

    expect(response.status).toBe(200);
    expect(mocks.applicationsNeq).toHaveBeenCalledWith("status", "DRAFT");
    expect(await response.json()).toEqual({
      applications: [{
        userId: "member-1",
        status: "SUBMITTED",
        headline: "Tennis coach for confident match play",
        submittedAt: "2026-08-05T10:30:00Z",
        applicantName: "Ayesha Khan",
      }],
    });
  });

  it("reviews another member through the protected database function", async () => {
    mocks.rpc.mockResolvedValue({
      data: { user_id: "member-1", status: "APPROVED" },
      error: null,
    });

    const response = await reviewApplication(reviewRequest({
      userId: "member-1",
      decision: "APPROVED",
      note: "Qualifications verified.",
    }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("review_coach_application", {
      target_user_id: "member-1",
      decision: "APPROVED",
      note: "Qualifications verified.",
    });
    expect(await response.json()).toMatchObject({ application: { userId: "member-1", status: "APPROVED" } });
  });
});
