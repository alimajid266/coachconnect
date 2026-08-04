import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

afterEach(() => vi.unstubAllGlobals());

describe("role-aware dashboard", () => {
  it("shows athlete actions without exposing coach administration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, displayName: "Ali Athlete", email: "ali@example.com", role: "ATHLETE" } }),
    }));
    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: /good to see you, ali athlete/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /find a coach/i })).toHaveAttribute("href", "/#coaches");
    expect(screen.queryByRole("link", { name: /build my coach profile/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/approve coach profiles/i)).not.toBeInTheDocument();
  });

  it("shows coaches their profile workflow and signs out", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 2, displayName: "Coach Ali", email: "coach@example.com", role: "COACH" } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ signedOut: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<DashboardPage />);

    expect(await screen.findByRole("link", { name: /build my coach profile/i })).toHaveAttribute("href", "/coach/profile");
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/logout");
    expect(await screen.findByRole("link", { name: /sign in again/i })).toHaveAttribute("href", "/account");
  });

  it("offers sign in when no session exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) }));
    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: /sign in to open your dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to sign in/i })).toHaveAttribute("href", "/account");
  });
});
