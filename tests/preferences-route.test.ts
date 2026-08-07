import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
const eq = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "member-1" } } })) },
      from: vi.fn(() => ({ update: (payload: unknown) => { update(payload); return { eq }; } })),
    },
    applyCookies: (response: Response) => response,
  }),
}));

import { PATCH } from "@/app/api/preferences/route";

beforeEach(() => {
  update.mockClear();
  eq.mockClear();
});

describe("recommendation preferences route", () => {
  it("persists normalized custom sports instead of restricting members to a fixed list", async () => {
    const request = new NextRequest("http://localhost/api/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({
        interests: [" Archery ", "archery", "Squash"],
        preferredLocation: "Lahore",
        maxBudgetPkr: 3000,
        trainingGoal: "Improve accuracy",
        experienceLevel: "Beginner",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ interests: ["Archery", "Squash"] }));
  });
});
