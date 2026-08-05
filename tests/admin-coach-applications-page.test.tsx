import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminCoachApplicationsPage from "@/app/admin/coaches/page";

afterEach(() => vi.unstubAllGlobals());

describe("coach application review page", () => {
  it("shows administrators the submitted profile and safe review actions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        applications: [{
          userId: "member-1",
          applicantName: "Ayesha Khan",
          status: "SUBMITTED",
          headline: "Tennis coach for confident match play",
          bio: "A detailed coaching biography that gives the reviewer enough information to assess the application.",
          sports: ["Tennis"],
          experienceYears: 8,
          qualifications: "Pakistan Tennis Federation coaching certification",
          audiences: ["Teenagers", "Adults"],
          levels: ["Beginner", "Intermediate"],
          lessonPlan: "Warm-up, technique assessment, focused drills, match play and a practical development plan.",
          sessionPricePkr: 4500,
          offersOnline: false,
          offersInPerson: true,
          city: "Lahore",
          publicArea: "Gulberg",
        }],
      }),
    }));

    render(<AdminCoachApplicationsPage />);

    expect(await screen.findByRole("heading", { name: /review coach applications/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ayesha khan/i })).toBeInTheDocument();
    expect(screen.getByText(/tennis coach for confident match play/i)).toBeInTheDocument();
    expect(screen.getByText(/gulberg, lahore/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request changes/i })).toBeInTheDocument();
  });
});
