import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  profileSingle: vi.fn(),
  applicationMaybeSingle: vi.fn(),
  signedAvatar: vi.fn(),
  applyCookies: vi.fn(<T>(response: T) => response),
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: {
      auth: {
        signUp: mocks.signUp,
        signInWithPassword: mocks.signInWithPassword,
        getUser: mocks.getUser,
        signOut: mocks.signOut,
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => table === "profiles"
            ? { single: mocks.profileSingle }
            : { maybeSingle: mocks.applicationMaybeSingle },
        }),
      }),
      storage: { from: () => ({ createSignedUrl: mocks.signedAvatar }) },
    },
    applyCookies: mocks.applyCookies,
  }),
}));

import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as getSession } from "@/app/api/auth/session/route";
import { POST as logout } from "@/app/api/auth/logout/route";

function request(path: string, body?: unknown, origin?: string) {
  return new NextRequest(`http://127.0.0.1:3000${path}`, {
    method: body ? "POST" : "GET",
    headers: body
      ? { "content-type": "application/json", ...(origin ? { origin } : {}) }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Supabase authentication routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyCookies.mockImplementation(<T>(response: T) => response);
    mocks.applicationMaybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.signedAvatar.mockResolvedValue({ data: { signedUrl: "https://images.example/avatar.webp" }, error: null });
  });

  it("registers one neutral member account without accepting a self-selected role", async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        user: { id: "user-1", email: "athlete@example.com" },
        session: { access_token: "redacted" },
      },
      error: null,
    });

    const response = await register(request("/api/auth/register", {
      displayName: "Ali Athlete",
      email: "athlete@example.com",
      password: "Private-Test-Passphrase-42",
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      user: { id: "user-1", displayName: "Ali Athlete", email: "athlete@example.com", role: "ATHLETE" },
    });
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "athlete@example.com",
      password: "Private-Test-Passphrase-42",
      options: {
        data: { display_name: "Ali Athlete", role: "ATHLETE" },
        emailRedirectTo: "http://localhost:3000/account",
      },
    });
    expect(mocks.applyCookies).toHaveBeenCalledOnce();
  });

  it("reports an existing account when Supabase returns no new identity", async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        user: { id: "existing-user", email: "athlete@example.com", identities: [] },
        session: null,
      },
      error: null,
    });

    const response = await register(request("/api/auth/register", {
      displayName: "Ali Athlete",
      email: "athlete@example.com",
      password: "Private-Test-Passphrase-42",
      role: "ATHLETE",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "An account already exists for this email. Sign in instead.",
    });
  });

  it("reports an existing account when Supabase returns its duplicate error", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });

    const response = await register(request("/api/auth/register", {
      displayName: "Ali Athlete",
      email: "athlete@example.com",
      password: "Private-Test-Passphrase-42",
      role: "ATHLETE",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "An account already exists for this email. Sign in instead.",
    });
  });

  it("uses generic login failures and returns a private profile session", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });
    const failed = await login(request("/api/auth/login", {
      email: "unknown@example.com",
      password: "wrong-password",
    }));
    expect(failed.status).toBe(401);
    expect(await failed.json()).toEqual({ error: "Email or password is incorrect." });

    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "coach@example.com" } },
      error: null,
    });
    mocks.profileSingle.mockResolvedValue({
      data: { display_name: "Coach Account", role: "COACH", avatar_path: "user-2/avatar.webp" },
      error: null,
    });
    mocks.applicationMaybeSingle.mockResolvedValue({
      data: { status: "APPROVED" },
      error: null,
    });
    const session = await getSession(request("/api/auth/session"));
    expect(session.status).toBe(200);
    expect(await session.json()).toEqual({
      user: {
        id: "user-2",
        displayName: "Coach Account",
        email: "coach@example.com",
        role: "COACH",
        avatarUrl: "https://images.example/avatar.webp",
        capabilities: { administrator: false, coachStatus: "APPROVED", coachFormats: { online: true, inPerson: true } },
      },
    });
  });

  it("signs out through Supabase and rejects cross-origin mutation", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    const signedOut = await logout(request("/api/auth/logout", {}));
    expect(signedOut.status).toBe(200);
    expect(mocks.signOut).toHaveBeenCalledOnce();

    const rejected = await register(request(
      "/api/auth/register",
      { displayName: "Cross Origin", email: "cross@example.com", password: "Private-Test-42", role: "ATHLETE" },
      "https://attacker.example",
    ));
    expect(rejected.status).toBe(403);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("does not claim logout succeeded when the account service throws", async () => {
    mocks.signOut.mockRejectedValueOnce(new Error("service unavailable"));

    const response = await logout(request("/api/auth/logout", {}));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Unable to sign out." });
  });

  it("reports session-service failures instead of claiming the member is signed out", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "auth gateway unavailable" },
    });

    const response = await getSession(request("/api/auth/session"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Account status is unavailable." });
  });

  it("reports coach-application lookup failures instead of silently removing capability", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-2", email: "coach@example.com" } },
      error: null,
    });
    mocks.profileSingle.mockResolvedValueOnce({
      data: { display_name: "Coach Account", role: "ATHLETE" },
      error: null,
    });
    mocks.applicationMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "database unavailable" },
    });

    const response = await getSession(request("/api/auth/session"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Coach status is unavailable." });
  });

  it("treats the expected absence of a session as signed out", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { name: "AuthSessionMissingError", message: "Auth session missing!" },
    });

    const response = await getSession(request("/api/auth/session"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: null });
  });
});
