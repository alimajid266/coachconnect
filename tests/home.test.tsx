import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("CoachConnect home page", () => {
  it("uses the stronger athletic homepage layout without becoming the catalog", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: /train smarter.*play bolder/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /athlete training with a coach/i })).toBeInTheDocument();
    expect(screen.getAllByText(/12 sports/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("region", { name: /coach results/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view .*profile/i })).not.toBeInTheDocument();
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
    expect(screen.getByText(/private details stay private/i)).toBeInTheDocument();
  });
});
