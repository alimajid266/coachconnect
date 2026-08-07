import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));

import CoachProfilePage from "@/app/coaches/[id]/page";

describe("standalone coach profile page", () => {
  it("renders a directly addressable demo profile and preserves the catalog return URL", async () => {
    const page = await CoachProfilePage({
      params: Promise.resolve({ id: "ayesha-khan" }),
      searchParams: Promise.resolve({ returnTo: "/coaches?query=cricket&city=Lahore" }),
    });
    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Ayesha Khan" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /illustrative cricket training image/i })).toBeInTheDocument();
    expect(screen.getByText(/^beginner batting technique$/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to coach results/i })).toHaveAttribute("href", "/coaches?query=cricket&city=Lahore");
    expect(screen.getAllByText("Demo profile").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/reviews do not apply to demo profiles/i)).toBeInTheDocument();
    expect(screen.queryByText(/no verified reviews yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /about ayesha/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /explore the experience/i }).compareDocumentPosition(screen.getByRole("heading", { name: /about ayesha/i })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { name: /who ayesha teaches/i })).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /levels supported/i })).toBeInTheDocument();
    expect(screen.getByText("Intermediate")).toBeInTheDocument();
    expect(screen.queryByText(/lessons taught/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /illustrative experience/i })).toBeInTheDocument();
    expect(screen.getByText(/illustrative coaching background/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /lesson plan/i })).toBeInTheDocument();
    expect(screen.getByText("Focused batting drills")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /example availability/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse real coaches/i })).toHaveAttribute("href", "/coaches");
    expect(screen.queryByRole("heading", { name: /frequently asked questions/i })).not.toBeInTheDocument();
    const location = screen.getByRole("region", { name: /ayesha khan's training area/i });
    expect(within(location).getByText(/Gulberg, Lahore/i)).toBeInTheDocument();
  });

  it("falls back to the safe catalog URL when returnTo is external", async () => {
    const page = await CoachProfilePage({
      params: Promise.resolve({ id: "ayesha-khan" }),
      searchParams: Promise.resolve({ returnTo: "https://attacker.example" }),
    });
    render(page);
    expect(screen.getByRole("link", { name: /back to coach results/i })).toHaveAttribute("href", "/coaches");
  });
});
