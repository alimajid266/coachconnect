import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CoachCatalog from "@/app/coaches/coach-catalog";
import { coaches } from "@/lib/coaches";

afterEach(() => vi.unstubAllGlobals());

function renderCatalog(user: object | null = null) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({
    ok: true,
    json: async () => String(input).includes("/api/coaches") ? { coaches } : { user },
  })));
  return render(<CoachCatalog initialQuery="" initialCity="any" initialCoaches={coaches} />);
}

describe("coach catalog", () => {
  it("renders rich approved-profile fixtures when supplied by the data source", async () => {
    renderCatalog();

    expect(screen.getByRole("heading", { level: 1, name: /find a coach/i })).toBeInTheDocument();
    const resultCount = Number(screen.getByRole("status").textContent?.match(/\d+/)?.[0]);
    expect(resultCount).toBeGreaterThan(10);
    expect(screen.getAllByRole("article").length).toBeGreaterThan(10);
    expect(document.body.textContent).not.toMatch(/sample|prototype|fictional/i);
    expect(screen.getByRole("heading", { name: "Ayesha Khan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bilal Raza" })).toBeInTheDocument();
  });

  it("does not publish hardcoded fixture coaches when the approved source is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({
      ok: true,
      json: async () => String(input).includes("/api/coaches") ? { coaches: [] } : { user: null },
    })));

    render(<CoachCatalog initialQuery="" initialCity="any" />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0 coaches"));
    expect(screen.queryByRole("heading", { name: "Ayesha Khan" })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("adds approved database coaches to the public catalog", async () => {
    const approvedCoach = {
      id: "approved-coach-1",
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
    expect(within(card as HTMLElement).getByText("New coach")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText(/newly approved/i)).toBeInTheDocument();
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
    expect(within(map).getByRole("button", { name: /view ayesha khan's profile/i })).toBeInTheDocument();
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

  it("shows lesson counts before a member opens a profile", () => {
    renderCatalog();

    const ayeshaCard = screen.getByRole("heading", { name: "Ayesha Khan" }).closest("article");
    expect(ayeshaCard).not.toBeNull();
    expect(within(ayeshaCard as HTMLElement).getByText(/96 lessons/i)).toBeInTheDocument();
  });

  it("shows the age groups a coach teaches", () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    const dialog = screen.getByRole("dialog", { name: /ayesha khan/i });
    expect(within(dialog).getByRole("heading", { name: /who ayesha teaches/i })).toBeInTheDocument();
    expect(within(dialog).getByText("Children")).toBeInTheDocument();
    expect(within(dialog).getByText("Adults")).toBeInTheDocument();
    expect(within(dialog).getByText("Seniors")).toBeInTheDocument();
  });

  it("shows supported levels without adding a level filter", () => {
    renderCatalog();

    expect(screen.queryByRole("combobox", { name: /level/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    const dialog = screen.getByRole("dialog", { name: /ayesha khan/i });
    expect(within(dialog).getByRole("heading", { name: /levels supported/i })).toBeInTheDocument();
    expect(within(dialog).getByText("Beginner")).toBeInTheDocument();
    expect(within(dialog).getByText("Intermediate")).toBeInTheDocument();
    expect(within(dialog).getByText("Advanced")).toBeInTheDocument();
  });

  it("shows how many lessons a coach has taught", () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    const dialog = screen.getByRole("dialog", { name: /ayesha khan/i });
    expect(within(dialog).getByLabelText("96 lessons taught")).toBeInTheDocument();
  });

  it("explains the structure of a typical lesson", () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    const dialog = screen.getByRole("dialog", { name: /ayesha khan/i });
    const heading = within(dialog).getByRole("heading", { name: /lesson plan/i });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByText("Goal check and warm-up")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("Focused skill work")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("Guided practice and next steps")).toBeInTheDocument();
  });

  it("provides accessible expandable profile FAQs", () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    const dialog = screen.getByRole("dialog", { name: /ayesha khan/i });
    expect(within(dialog).getByRole("heading", { name: /frequently asked questions/i })).toBeInTheDocument();
    const question = within(dialog).getByText("Is this suitable for someone new to the sport?");
    const details = question.closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(question);
    expect(details).toHaveAttribute("open");
    expect(within(details as HTMLElement).getByText(/sessions are adapted to the athlete's current ability/i)).toBeInTheDocument();
  });

  it("opens clear profile details from a catalog card", async () => {
    renderCatalog();

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    const dialog = screen.getByRole("dialog", { name: /ayesha khan/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/^beginner batting technique$/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /about ayesha/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /experience and credentials/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/8 years of coaching experience/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/PCB Level 1/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /coaching style/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/English · Urdu/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /weekly availability/i })).toBeInTheDocument();
    const locationPreview = within(dialog).getByRole("region", { name: /ayesha khan's training area/i });
    expect(within(locationPreview).getByText(/approximate training area/i)).toBeInTheDocument();
    expect(within(locationPreview).getByText(/Gulberg, Lahore/i)).toBeInTheDocument();
    expect(within(locationPreview).getByText(/exact meeting details are shared after booking/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/stay private|private by default/i)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/booking requests are not open yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close coach profile/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the coach profile with Escape and restores focus to its trigger", async () => {
    renderCatalog();
    const trigger = screen.getByRole("button", { name: /view ayesha khan's profile/i });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /close coach profile/i })).toHaveFocus());

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps an authenticated member visibly signed in on the catalog", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1", displayName: "Ali", email: "ali@example.com", role: "ATHLETE" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CoachCatalog initialQuery="" initialCity="any" initialCoaches={coaches} />);

    expect(await screen.findByRole("link", { name: /my account/i })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: /become a coach/i })).toHaveAttribute("href", "/coach/apply");
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));
    expect(screen.getByText(/booking requests are not open yet/i)).toBeInTheDocument();
  });

  it("shows sign in only after confirming there is no session", async () => {
    renderCatalog(null);
    expect(await screen.findByRole("link", { name: /^sign in$/i })).toHaveAttribute("href", "/account");
    await waitFor(() => expect(screen.queryByText(/checking account/i)).not.toBeInTheDocument());
  });

  it("does not claim a member is signed out when session status is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("session unavailable")));
    render(<CoachCatalog initialQuery="" initialCity="any" initialCoaches={coaches} />);

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    expect(await screen.findByRole("link", { name: /my account/i })).toHaveAttribute("href", "/account");
    expect(screen.getByText(/booking requests are not open yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });
});
