import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const ORIGIN = "https://coachconnect-sigma.vercel.app";

describe("password recovery proxy", () => {
  it("routes a recovery code arriving at the homepage through the secure callback", () => {
    const response = proxy(new NextRequest(
      `${ORIGIN}/?code=fixture-recovery-code&next=https%3A%2F%2Fexample.com`,
    ));
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(location.origin).toBe(ORIGIN);
    expect(location.pathname).toBe("/auth/callback");
    expect(location.searchParams.get("code")).toBe("fixture-recovery-code");
    expect(location.searchParams.get("next")).toBe("/account/reset-password");
  });

  it("leaves ordinary homepage requests unchanged", () => {
    const response = proxy(new NextRequest(`${ORIGIN}/`));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
