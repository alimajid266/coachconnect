import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CoachCatalog from "@/app/coaches/coach-catalog";
import { coaches } from "@/lib/coaches";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderCatalog(user: object | null = null) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({
    ok: true,
    json: async () => String(input).includes("/api/coaches")
      ? { coaches: [], demos: coaches, demosAvailable: true }
      : { user },
  })));
  return render(<CoachCatalog initialQuery="" initialCity="any" initialCoaches={coaches} />);
}

describe("coach catalog", () => {
  it("renders rich demo profiles with clear labels", async () => {
    renderCatalog();

    expect(screen.getByRole("heading", { level: 1, name: /find a coach/i })).toBeInTheDocument();
    const resultCount = Number(screen.getByRole("status").textContent?.match(/\d+/)?.[0]);
    expect(resultCount).toBeGreaterThan(10);
    expect(screen.getAllByRole("article").length).toBeGreaterThan(10);
    expect(screen.getAllByText("Demo profile").length).toBeGreaterThanOrEqual(coaches.length);
    expect(document.querySelectorAll(".catalog-coach-placeholder")).toHaveLength(coaches.length);
    const ayeshaHeading = screen.getByRole("heading", { name: "Ayesha Khan" });
    expect(ayeshaHeading).toBeInTheDocument();
    const ayeshaCard = ayeshaHeading.closest("article") as HTMLElement;
    expect(within(ayeshaCard).getByText("Demo")).toBeInTheDocument();
    expect(within(ayeshaCard).queryByText("New")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bilal Raza" })).toBeInTheDocument();
  });

  it("links every catalog card to a standalone profile page", () => {
    renderCatalog();
    const link = screen.getByRole("link", { name: /view ayesha khan's profile/i });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^\/coaches\/ayesha-khan\?returnTo=/));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps labeled demo coaches available when no approved coaches exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({
      ok: true,
      json: async () => String(input).includes("/api/coaches") ? { coaches: [] } : { user: null },
    })));

    render(<CoachCatalog initialQuery="" initialCity="any" />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(`${coaches.length} coaches`));
    expect(screen.getByRole("heading", { name: "Ayesha Khan" })).toBeInTheDocument();
    expect(screen.getAllByText("Demo profile").length).toBeGreaterThanOrEqual(coaches.length);
  });

  it("removes inactive demos after the durable demo projection responds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({
      ok: true,
      json: async () => String(input).includes("/api/coaches")
        ? { coaches: [], demos: [], demosAvailable: true }
        : { user: null },
    })));

    render(<CoachCatalog initialQuery="" initialCity="any" initialCoaches={coaches} />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0 coaches"));
    expect(screen.queryByRole("heading", { name: "Ayesha Khan" })).not.toBeInTheDocument();
  });

  it("adds approved database coaches to the public catalog", async () => {
    const approvedCoach = {
      id: "approved-coach-1",
      isDemo: false,
      name: "Ali Coach",
      location: "Rawalpindi",
      sports: ["Tennis"],
      specialty: "Patient tennis coaching",
      rating: null,
      reviewCount: 0,
      price: 3500,
      reason: "Patient tennis coaching",
      badge: "New coach",
      mode: "In person + Online",
      offersOnline: true,
      offersInPerson: true,
      area: "Ayub Park",
      coordinates: null,
      availability: ["Saturday"],
      image: null,
      rank: 1000,
      bio: "Structured coaching for adults who want dependable technique and confidence.",
      experience: "5 years of coaching experience",
      credentials: ["Certified tennis coach"],
      coachingStyle: "",
      languages: [],
      lessonCount: 0,
      audiences: ["Adults"],
      levels: ["Beginner"],
      lessonPlan: [{ title: "Typical session", description: "Warm-up, technique and guided play." }],
      faqs: [],
    };
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({
      ok: true,
      json: async () => String(input).includes("/api/coaches")
        ? { coaches: [approvedCoach] }
        : { user: null },
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CoachCatalog initialQuery="" initialCity="any" />);

    const heading = await screen.findByRole("heading", { name: "Ali Coach" });
    const card = heading.closest("article");
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getAllByText("New coach").length).toBeGreaterThan(0);
    expect(within(card as HTMLElement).queryByText(/newly approved/i)).not.toBeInTheDocument();
    expect(within(card as HTMLElement).queryByText("Demo profile")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/coaches", {
      cache: "no-store",
      credentials: "same-origin",
    });
  });

  it("opens a map view without removing the coach list", () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /show map/i }));

    expect(screen.getByRole("region", { name: /coach locations/i })).toBeInTheDocument();
    expect(screen.getByText(/11 training areas/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ayesha Khan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hide map/i })).toBeInTheDocument();
  });

  it("resolves an approximate marker from an approved coach's public area", async () => {
    const approvedCoach = {
      ...coaches[0],
      id: "approved-area-coach",
      name: "Ali Coach",
      location: "Islamabad",
      area: "I-8",
      coordinates: null,
      offersOnline: false,
      offersInPerson: true,
    };
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", "public-map-token");
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.mapbox.com/search/geocode")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ features: [{ geometry: { coordinates: [73.07296, 33.6688574] } }] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => url.includes("/api/coaches") ? { coaches: [approvedCoach] } : { user: null },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CoachCatalog initialQuery="" initialCity="any" initialCoaches={[approvedCoach]} />);
    fireEvent.click(screen.getByRole("button", { name: /show map/i }));

    const map = screen.getByRole("region", { name: /coach locations/i });
    expect(await within(map).findByRole("button", { name: /show ali coach in i-8 on map/i })).toBeInTheDocument();
    expect(within(map).getByText(/1 approximate training area/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/api\.mapbox\.com\/search\/geocode\/v6\/forward/));
  });

  it("keeps map results synchronized with catalog filters", () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /show map/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /city/i }), { target: { value: "Lahore" } });

    const map = screen.getByRole("region", { name: /coach locations/i });
    expect(within(map).getByText(/4 training areas in Lahore/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("5 coaches");
  });

  it("opens coach details from a map marker", () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /show map/i }));
    const map = screen.getByRole("region", { name: /coach locations/i });
    fireEvent.click(within(map).getByRole("button", { name: /show ayesha khan in gulberg on map/i }));

    expect(within(map).getByRole("heading", { name: "Ayesha Khan" })).toBeInTheDocument();
    expect(within(map).getByText(/Gulberg, Lahore/i)).toBeInTheDocument();
    expect(within(map).getByRole("link", { name: /view ayesha khan's profile/i })).toHaveAttribute("href", expect.stringMatching(/^\/coaches\/ayesha-khan/));
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

    expect(screen.getByRole("status")).toHaveTextContent("5 coaches");
    expect(screen.getByRole("heading", { name: "Hamza Siddiqui" })).toBeInTheDocument();
  });

  it("sorts visible coaches by price", () => {
    renderCatalog();

    fireEvent.change(screen.getByRole("combobox", { name: /sort/i }), { target: { value: "price-low" } });
    const cards = screen.getAllByRole("article");
    expect(within(cards[0]).getByRole("heading", { name: "Nadia Hussain" })).toBeInTheDocument();
    expect(within(cards[cards.length - 1]).getByRole("heading", { name: "Farhan Akram" })).toBeInTheDocument();
  });

  it("does not show fabricated lesson counts on demo cards", () => {
    renderCatalog();

    const ayeshaCard = screen.getByRole("heading", { name: "Ayesha Khan" }).closest("article");
    expect(ayeshaCard).not.toBeNull();
    expect(within(ayeshaCard as HTMLElement).queryByText(/lessons/i)).not.toBeInTheDocument();
  });

  it("keeps level detail on profiles instead of adding another catalog filter", () => {
    renderCatalog();
    expect(screen.queryByRole("combobox", { name: /level/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view ayesha khan's profile/i })).toHaveAttribute("href", expect.stringMatching(/^\/coaches\/ayesha-khan/));
  });

  it("keeps an authenticated member visibly signed in on the catalog", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1", displayName: "Ali", email: "ali@example.com", role: "ATHLETE" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CoachCatalog initialQuery="" initialCity="any" initialCoaches={coaches} />);

    const accountMenu = await screen.findByRole("button", { name: /open account menu for ali/i });
    fireEvent.click(accountMenu);
    expect(screen.getByRole("menuitem", { name: /my account/i })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: /become a coach/i })).toHaveAttribute("href", "/coach/apply");
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
  });

  it("shows sign in only after confirming there is no session", async () => {
    renderCatalog(null);
    expect(await screen.findByRole("link", { name: /^sign in$/i })).toHaveAttribute("href", "/account");
    await waitFor(() => expect(screen.queryByText(/checking account/i)).not.toBeInTheDocument());
  });

  it("does not claim a member is signed out when session status is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("session unavailable")));
    render(<CoachCatalog initialQuery="" initialCity="any" initialCoaches={coaches} />);

    expect(await screen.findByRole("link", { name: /my account/i })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });
});
