import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CoachCatalog from "@/app/coaches/coach-catalog";

afterEach(() => vi.unstubAllGlobals());

function renderCatalog(user: object | null = null) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ user }),
  }));
  return render(<CoachCatalog initialQuery="" initialCity="any" />);
}

describe("coach catalog", () => {
  it("shows every approved sample coach on a dedicated catalog page", async () => {
    renderCatalog();

    expect(screen.getByRole("heading", { level: 1, name: /find a coach/i })).toBeInTheDocument();
    const resultCount = Number(screen.getByRole("status").textContent?.match(/\d+/)?.[0]);
    expect(resultCount).toBeGreaterThan(10);
    expect(screen.getAllByRole("article").length).toBeGreaterThan(10);
    expect(screen.getByText(/names, profiles and reviews are fictional sample data/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ayesha Khan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bilal Raza" })).toBeInTheDocument();
  });

  it("filters the catalog without hiding the complete list behind search", () => {
    renderCatalog();

    fireEvent.change(screen.getByRole("combobox", { name: /sport/i }), { target: { value: "Cricket" } });
    fireEvent.change(screen.getByRole("combobox", { name: /city/i }), { target: { value: "Lahore" } });

    expect(screen.getByRole("status")).toHaveTextContent("1 coach");
    expect(screen.getByRole("heading", { name: "Ayesha Khan" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Zainab Malik" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(screen.getByRole("status")).toHaveTextContent("15 coaches");
  });

  it("allows one coach to be discovered through each sport they teach", () => {
    renderCatalog();

    expect(screen.getByRole("option", { name: "Badminton" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: /sport/i }), { target: { value: "Badminton" } });

    expect(screen.getByRole("status")).toHaveTextContent("2 coaches");
    const hamzaCard = screen.getByRole("heading", { name: "Hamza Siddiqui" }).closest("article");
    expect(hamzaCard).not.toBeNull();
    expect(within(hamzaCard as HTMLElement).getByText(/Tennis · Badminton/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hira Noor" })).toBeInTheDocument();
  });

  it("accepts ordinary searches such as tennis coach", () => {
    renderCatalog();

    fireEvent.change(screen.getByRole("searchbox", { name: /search/i }), { target: { value: "tennis coach" } });
    fireEvent.change(screen.getByRole("combobox", { name: /city/i }), { target: { value: "Karachi" } });

    expect(screen.getByRole("status")).toHaveTextContent("1 coach");
    expect(screen.getByRole("heading", { name: "Hamza Siddiqui" })).toBeInTheDocument();
  });

  it("sorts visible coaches by price", () => {
    renderCatalog();

    fireEvent.change(screen.getByRole("combobox", { name: /sort/i }), { target: { value: "price-low" } });
    const cards = screen.getAllByRole("article");
    expect(within(cards[0]).getByRole("heading", { name: "Nadia Hussain" })).toBeInTheDocument();
    expect(within(cards[cards.length - 1]).getByRole("heading", { name: "Farhan Akram" })).toBeInTheDocument();
  });

  it("opens clear profile details from a catalog card", () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    const dialog = screen.getByRole("dialog", { name: /ayesha khan/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/beginner batting technique/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /about ayesha/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /experience and credentials/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/8 years coaching/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/PCB Level 1/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /coaching style/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/English · Urdu/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /weekly availability/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /sign in to reserve/i })).toHaveAttribute("href", "/account");

    fireEvent.click(screen.getByRole("button", { name: /close coach profile/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps an authenticated member visibly signed in on the catalog", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1", displayName: "Ali", email: "ali@example.com", role: "ATHLETE" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CoachCatalog initialQuery="" initialCity="any" />);

    expect(await screen.findByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", { credentials: "same-origin" });
  });

  it("shows sign in only after confirming there is no session", async () => {
    renderCatalog(null);
    expect(await screen.findByRole("link", { name: /^sign in$/i })).toHaveAttribute("href", "/account");
    await waitFor(() => expect(screen.queryByText(/checking account/i)).not.toBeInTheDocument());
  });
});
