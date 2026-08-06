import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
  saveSingle: vi.fn(),
  applicationMaybeSingle: vi.fn(),
  rpc: vi.fn(),
  applyCookies: vi.fn(<T>(response: T) => response),
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: {
      auth: { getUser: mocks.getUser },
      rpc: mocks.rpc,
      from: () => ({
        upsert: mocks.upsert,
        select: () => ({
          eq: () => ({ maybeSingle: mocks.applicationMaybeSingle }),
        }),
      }),
    },
    applyCookies: mocks.applyCookies,
  }),
}));

import { GET as getApplication, POST as submitApplication, PUT as saveApplication } from "@/app/api/coach-application/route";

function request(body: unknown) {
  return new NextRequest("http://127.0.0.1:3000/api/coach-application", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest() {
  return new NextRequest("http://127.0.0.1:3000/api/coach-application");
}

function submitRequest() {
  return new NextRequest("http://127.0.0.1:3000/api/coach-application", { method: "POST" });
}

const validDraft = {
  headline: "Patient tennis coaching for confident match play",
  bio: "I help players build reliable technique, thoughtful match habits and confidence through structured, encouraging sessions.",
  sports: ["Tennis"],
  experienceYears: 8,
  qualifications: "ITF Level 1 coaching certificate",
  audiences: ["Adults"],
  levels: ["Beginner", "Intermediate"],
  lessonPlan: "We begin with movement and technique, practise realistic patterns, then finish with feedback and next steps.",
  sessionPricePkr: 4500,
  offersOnline: false,
  offersInPerson: true,
  city: "Lahore",
  publicArea: "Gulberg",
  availability: [],
  faqs: [],
};

describe("coach application routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyCookies.mockImplementation(<T>(response: T) => response);
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "member-1", email: "member@example.com" } },
      error: null,
    });
    mocks.saveSingle.mockResolvedValue({
      data: { user_id: "member-1", status: "DRAFT", headline: validDraft.headline },
      error: null,
    });
    mocks.upsert.mockReturnValue({ select: () => ({ single: mocks.saveSingle }) });
    mocks.applicationMaybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it("saves only member-editable draft fields under the authenticated identity", async () => {
    const response = await saveApplication(request({
      ...validDraft,
      userId: "another-user",
      status: "APPROVED",
      reviewedBy: "another-user",
    }));

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "member-1",
      headline: validDraft.headline,
      sports: ["Tennis"],
      offers_in_person: true,
      public_area: "Gulberg",
    }), { onConflict: "user_id" });
    const saved = mocks.upsert.mock.calls[0][0];
    expect(saved).not.toHaveProperty("status");
    expect(saved).not.toHaveProperty("reviewed_by");
    expect(await response.json()).toEqual({
      application: { userId: "member-1", status: "DRAFT", headline: validDraft.headline },
    });
  });

  it("reports authentication outages without telling a member to sign in", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "auth gateway unavailable" },
    });

    const response = await getApplication(getRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Account status is unavailable." });
  });

  it("returns the authenticated member's current application", async () => {
    mocks.applicationMaybeSingle.mockResolvedValue({
      data: {
        user_id: "member-1",
        status: "UNDER_REVIEW",
        headline: validDraft.headline,
        sports: ["Tennis"],
        offers_online: false,
        offers_in_person: true,
        public_area: "Gulberg",
      },
      error: null,
    });

    const response = await getApplication(getRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      application: {
        userId: "member-1",
        status: "UNDER_REVIEW",
        offersInPerson: true,
        publicArea: "Gulberg",
      },
    });
  });

  it("clears stale public location fields when in-person coaching is turned off", async () => {
    await saveApplication(request({
      ...validDraft,
      offersOnline: true,
      offersInPerson: false,
      city: "Lahore",
      publicArea: "Gulberg",
    }));

    expect(mocks.upsert.mock.calls[0][0]).toMatchObject({
      offers_online: true,
      offers_in_person: false,
      city: null,
      public_area: null,
    });
  });

  it("submits the authenticated member's saved application through the protected lifecycle", async () => {
    mocks.rpc.mockResolvedValue({
      data: { user_id: "member-1", status: "SUBMITTED", submitted_at: "2026-08-05T10:30:00Z" },
      error: null,
    });

    const response = await submitApplication(submitRequest());

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("submit_coach_application");
    expect(await response.json()).toMatchObject({
      application: { userId: "member-1", status: "SUBMITTED" },
    });
  });
});
