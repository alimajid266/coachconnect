import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  applyCookies: vi.fn(<T>(response: T) => response),
  listMedia: vi.fn(),
  removeMedia: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ storage: { from: () => ({ list: mocks.listMedia, remove: mocks.removeMedia }) } }),
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: {
      auth: {
        getUser: mocks.getUser,
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut,
      },
      rpc: mocks.rpc,
    },
    applyCookies: mocks.applyCookies,
  }),
}));

import { DELETE } from "@/app/api/account/route";

function request(origin?: string, password = "Current-Password-42", cookie?: string) {
  return new NextRequest("http://127.0.0.1:3000/api/account", {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ password }),
  });
}

describe("account deletion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyCookies.mockImplementation(<T>(response: T) => response);
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "member-1" } },
      error: null,
    });
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-test-key");
    mocks.listMedia.mockResolvedValue({ data: [], error: null });
    mocks.removeMedia.mockResolvedValue({ data: [], error: null });
  });

  it("rejects cross-origin deletion before touching the session", async () => {
    const result = await DELETE(request("https://attacker.example"));

    expect(result.status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires an authenticated member", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "missing" } });

    const result = await DELETE(request());

    expect(result.status).toBe(401);
    expect(await result.json()).toEqual({ error: "Sign in before deleting your account." });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires the member's current password before deletion", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "member-1", email: "member@example.com" } },
      error: null,
    });
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });

    const result = await DELETE(request());

    expect(result.status).toBe(403);
    expect(await result.json()).toEqual({ error: "Your current password is incorrect." });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects an empty password before touching account data", async () => {
    const result = await DELETE(request(undefined, ""));

    expect(result.status).toBe(400);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("deletes only through the protected self-deletion function and clears the session", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "member-1", email: "member@example.com" } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.listMedia
      .mockResolvedValueOnce({ data: [{ name: "avatar.webp" }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const result = await DELETE(request());

    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ deleted: true });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "Current-Password-42",
    });
    expect(mocks.rpc.mock.calls.map((call) => call[0])).toEqual(["begin_my_account_deletion", "delete_my_account"]);
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.applyCookies).toHaveBeenCalledOnce();
  });

  it("keeps the account and session intact when database deletion fails", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "member-1", email: "member@example.com" } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });

    const result = await DELETE(request());

    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ error: "Unable to delete your account." });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("preserves the other participant's record when booking history exists", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "member-1", email: "member@example.com" } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Booking history must be retained" } });

    const result = await DELETE(request());

    expect(result.status).toBe(409);
    expect(await result.json()).toEqual({ error: "Accounts with booking history cannot be self-deleted because the other participant's session record must be retained. Contact support for anonymization." });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it.each([
    ["returns an error", () => mocks.signOut.mockResolvedValueOnce({ error: { message: "session unavailable" } })],
    ["throws", () => mocks.signOut.mockRejectedValueOnce(new Error("session unavailable"))],
  ])("still reports completed deletion and expires stale cookies when sign-out %s", async (_case, failSignOut) => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "member-1", email: "member@example.com" } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    failSignOut();

    const result = await DELETE(request(undefined, "Current-Password-42", "sb-project-auth-token=stale"));

    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ deleted: true });
    expect(result.headers.get("set-cookie")).toMatch(/sb-project-auth-token=.*Max-Age=0/i);
  });
});
