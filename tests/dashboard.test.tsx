import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

afterEach(() => vi.unstubAllGlobals());

describe("role-aware dashboard", () => {
  it("shows athlete actions without exposing coach administration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, displayName: "Ali Athlete", email: "ali@example.com", role: "ATHLETE", capabilities: { administrator: false, coachStatus: null } } }),
    }));
    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: /good to see you, ali athlete/i })).toBeInTheDocument();
    expect(screen.getByText(/member dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/find coaching/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/private|sample|prototype|fictional/i);
    expect(screen.queryByText(/athlete dashboard/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /find a coach/i })).toHaveAttribute("href", "/coaches");
    expect(screen.getByRole("link", { name: /become a coach/i })).toHaveAttribute("href", "/coach/apply");
    expect(screen.getByText(/application not started/i)).toBeInTheDocument();
    expect(screen.queryByText(/approve coach profiles/i)).not.toBeInTheDocument();
  });

  it("shows coaches their profile workflow and signs out", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 2, displayName: "Coach Ali", email: "coach@example.com", role: "ATHLETE", capabilities: { administrator: false, coachStatus: "APPROVED" } } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ signedOut: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<DashboardPage />);

    expect(await screen.findByRole("link", { name: /manage coach profile/i })).toHaveAttribute("href", "/coach/apply");
    expect(screen.getByRole("link", { name: /find a coach/i })).toHaveAttribute("href", "/coaches");
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/logout");
    expect(await screen.findByRole("link", { name: /sign in again/i })).toHaveAttribute("href", "/account");
  });

  it("shows protected application review only to administrators", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 3, displayName: "Review Admin", email: "admin@example.com", role: "ADMIN", capabilities: { administrator: true, coachStatus: null } } }),
    }));
    render(<DashboardPage />);

    expect(await screen.findByRole("link", { name: /review applications/i })).toHaveAttribute("href", "/admin/coaches");
    expect(screen.queryByRole("link", { name: /become a coach/i })).not.toBeInTheDocument();
  });

  it("offers sign in when no session exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) }));
    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: /sign in to open your dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to sign in/i })).toHaveAttribute("href", "/account");
  });
});
