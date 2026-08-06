import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CoachApplicationPage from "@/app/coach/apply/page";

afterEach(() => vi.unstubAllGlobals());

describe("coach application page", () => {
  it("gives a signed-in member a complete privacy-safe application form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ application: null }),
    }));

    render(<CoachApplicationPage />);

    expect(await screen.findByRole("heading", { name: /build your coach profile/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/professional headline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/coaching biography/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /sports you coach/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /people you coach/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /training formats/i })).toBeInTheDocument();
    expect(screen.getByText(/never enter a home address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit for review/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CoachConnect home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it("shows a suspension reason and a recovery path", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        application: {
          userId: "member-1",
          status: "SUSPENDED",
          reviewNote: "Please renew your safeguarding certificate before requesting reactivation.",
        },
      }),
    }));

    render(<CoachApplicationPage />);

    expect(await screen.findByText(/please renew your safeguarding certificate/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact support about reactivation/i })).toHaveAttribute("href", "mailto:support@coachconnect.pk?subject=Coach%20profile%20reactivation");
    expect(screen.getByText(/cannot be edited while it is suspended/i)).toBeInTheDocument();
  });
});
