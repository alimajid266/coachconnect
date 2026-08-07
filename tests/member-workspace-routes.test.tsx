import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SessionsPage from "@/app/sessions/page";
import TrainingPlansPage from "@/app/training-plans/page";
import RecommendationsPage from "@/app/recommendations/page";

vi.mock("@/components/schedule-manager", () => ({ default: () => <div>Sessions workspace content</div> }));
vi.mock("@/components/training-plan-builder", () => ({ default: () => <div>Training plan workspace content</div> }));
vi.mock("@/components/recommendation-preferences", () => ({ default: () => <div>Recommendation workspace content</div> }));

const member = {
  id: "member-1",
  displayName: "Ali Member",
  email: "ali@example.com",
  role: "ATHLETE",
  capabilities: { administrator: false, coachStatus: null },
};

afterEach(() => vi.unstubAllGlobals());

function session() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: member }) }));
}

describe("member workspaces", () => {
  it.each([
    [SessionsPage, "Sessions and bookings", "Sessions workspace content"],
    [TrainingPlansPage, "Training plans", "Training plan workspace content"],
    [RecommendationsPage, "Recommendation preferences", "Recommendation workspace content"],
  ])("renders a dedicated authenticated page", async (Page, heading, content) => {
    session();
    render(<Page />);
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
  });
});
