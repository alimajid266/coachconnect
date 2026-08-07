import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminCoachApplicationsPage from "@/app/admin/coaches/page";

afterEach(() => vi.unstubAllGlobals());

describe("coach application review page", () => {
  it("uses the shared branded loader while applications are loading", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<AdminCoachApplicationsPage />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading coach applications/i);
    expect(document.querySelector(".sports-loader-logo")).toHaveAttribute(
      "src",
      "/brand/coachconnect-linked-rings.svg",
    );
  });

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
    expect(screen.getByRole("button", { name: /suspend full member account/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CoachConnect home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it("lets administrators restore a coach removed from the catalog", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        applications: [{
          userId: "member-2",
          applicantName: "Removed Coach",
          status: "SUSPENDED",
          headline: "Experienced swimming coach",
          sports: ["Swimming"],
          offersOnline: false,
          offersInPerson: true,
          city: "Islamabad",
          publicArea: "F-8",
        }],
      }),
    }));

    render(<AdminCoachApplicationsPage />);

    expect(await screen.findByRole("button", { name: /restore coach profile/i })).toBeInTheDocument();
    expect(screen.getByText(/removed from the public catalog/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete member account/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suspend full member account/i })).toBeInTheDocument();
  });

  it("keeps the removal reason visually grouped with the catalog-removal action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        applications: [{
          userId: "member-3",
          applicantName: "Approved Coach",
          status: "APPROVED",
          headline: "Approved coach",
          sports: ["Football"],
          offersOnline: true,
          offersInPerson: false,
          accountStatus: "ACTIVE",
        }],
      }),
    }));

    render(<AdminCoachApplicationsPage />);

    await screen.findByRole("heading", { name: "Approved Coach" });
    const removalReason = screen.getByLabelText("Removal reason");
    expect(removalReason.closest(".admin-removal-controls")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Remove from catalog" }).closest(".admin-removal-controls")).not.toBeNull();
  });
});
