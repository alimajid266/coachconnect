import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  applyCookies: vi.fn(<T>(response: T) => response),
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: () => ({
    supabase: { auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      updateUser: mocks.updateUser,
      signOut: mocks.signOut,
    } },
    applyCookies: mocks.applyCookies,
  }),
}));

import { POST as requestPasswordReset } from "@/app/api/auth/forgot-password/route";
import { GET as authCallback } from "@/app/auth/callback/route";
import { POST as updatePassword } from "@/app/api/auth/update-password/route";

function request(path: string, body: unknown) {
  return new NextRequest(`http://127.0.0.1:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("password recovery routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyCookies.mockImplementation(<T>(response: T) => response);
  });

  it("requests password recovery through the secure callback", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const response = await requestPasswordReset(request("/api/auth/forgot-password", {
      email: "  Athlete@Example.com ",
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Check your inbox for password reset instructions.",
    });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "athlete@example.com",
      { redirectTo: "http://localhost:3000/auth/callback?next=%2Faccount%2Freset-password" },
    );
  });

  it("exchanges the recovery code and redirects to password change", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null });
    const response = await authCallback(new NextRequest(
      "http://127.0.0.1:3000/auth/callback?code=recovery-code&next=%2Faccount%2Freset-password",
    ));
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("recovery-code");
    expect(mocks.applyCookies).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/account/reset-password");
  });

  it("updates a matching recovery password through the authenticated session", async () => {
    mocks.updateUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    const password = "New-Private-Passphrase-42";
    const response = await updatePassword(request("/api/auth/update-password", {
      password,
      passwordConfirmation: password,
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Password updated. You can now sign in." });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password });
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.applyCookies).toHaveBeenCalledOnce();
  });
});
