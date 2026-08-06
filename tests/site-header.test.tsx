import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SiteHeader from "@/components/site-header";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("site header", () => {
  it("keeps one CoachConnect logo and shows account-aware member actions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: "member-1",
          displayName: "Ali Member",
          email: "ali@example.com",
          role: "ATHLETE",
          capabilities: { administrator: false, coachStatus: null },
        },
      }),
    }));

    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "CoachConnect home" })).toHaveAttribute("href", "/");
    expect(await screen.findByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "Become a coach" })).toHaveAttribute("href", "/coach/apply");
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it("does not falsely show a signed-in member as logged out while session is loading", async () => {
    let resolveSession: ((value: unknown) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((resolve) => { resolveSession = resolve; })));

    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/checking account/i)).toBeInTheDocument();

    resolveSession?.({
      ok: true,
      json: async () => ({ user: null }),
    });
    await waitFor(() => expect(screen.getByRole("link", { name: /^sign in$/i })).toBeInTheDocument());
  });

  it("routes anonymous coach applicants through sign in and back to the application", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) }));

    render(<SiteHeader />);

    expect(await screen.findByRole("link", { name: "Become a coach" })).toHaveAttribute(
      "href",
      "/account?next=%2Fcoach%2Fapply",
    );
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute("href", "/account");
  });

  it("turns the coach action into profile management after approval", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: "coach-1",
          displayName: "Coach One",
          email: "coach@example.com",
          role: "ATHLETE",
          capabilities: { administrator: false, coachStatus: "APPROVED" },
        },
      }),
    }));

    render(<SiteHeader />);

    expect(await screen.findByRole("link", { name: "Coach profile" })).toHaveAttribute("href", "/coach/apply");
    expect(screen.queryByRole("link", { name: "Become a coach" })).not.toBeInTheDocument();
  });
});
