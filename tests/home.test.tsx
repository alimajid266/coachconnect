import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

afterEach(() => vi.unstubAllGlobals());

describe("CoachConnect home page", () => {
  it("uses the stronger athletic homepage layout without becoming the catalog", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: /train smarter.*play bolder/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /football coaching session/i })).toBeInTheDocument();
    expect(screen.getAllByText(/12 sports/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("region", { name: /coach results/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view .*profile/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/sample|prototype|fictional|private by default|sample marketplace data/i);
  });

  it("uses Ali's supplied sports photography without presenting athletes as coaches", () => {
    render(<HomePage />);

    expect(screen.getByRole("img", { name: /football coaching session/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /cricket stadium/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /tennis serve practice/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /football training on the pitch/i })).toBeInTheDocument();
  });

  it("uses the dedicated coach catalog for every discovery link", () => {
    render(<HomePage />);

    const links = screen.getAllByRole("link", { name: /find a coach|browse coaches/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((link) => link.getAttribute("href") === "/coaches")).toBe(true);
    expect(screen.queryByRole("link", { name: /search coaches/i })).not.toBeInTheDocument();
  });

  it("submits the simple home search to the catalog", () => {
    render(<HomePage />);

    const form = screen.getByRole("form", { name: /find a coach/i });
    expect(form).toHaveAttribute("action", "/coaches");
    expect(screen.getByRole("searchbox", { name: /sport, coach or specialty/i })).toHaveAttribute("name", "query");
    expect(screen.getByRole("combobox", { name: /city/i })).toHaveAttribute("name", "city");
  });

  it("keeps the explanation short and clear", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /how coachconnect works/i })).toBeInTheDocument();
    expect(screen.getByText(/browse approved coaches/i)).toBeInTheDocument();
    expect(screen.getByText(/check pricing, training format and public meeting areas/i)).toBeInTheDocument();
  });

  it("keeps an existing session visible when a member returns home", async () => {
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

    render(<HomePage />);

    const accountMenu = await screen.findByRole("button", { name: /open account menu for ali member/i });
    fireEvent.click(accountMenu);
    expect(screen.getByRole("menuitem", { name: "My account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: "Become a coach" })).toHaveAttribute("href", "/coach/apply");
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });
});
