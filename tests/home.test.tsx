import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

afterEach(() => vi.unstubAllGlobals());

describe("CoachConnect home page", () => {
  it("uses the stronger athletic homepage layout without becoming the catalog", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: /find your coach.*reach your next level/i })).toBeInTheDocument();
    const videos = Array.from(document.querySelectorAll("video"));
    expect(videos).toHaveLength(1);
    expect(screen.getByRole("button", { name: /play homepage sports video/i })).toBeInTheDocument();
    expect(videos[0]).toHaveAttribute("autoplay");
    expect(videos[0]).not.toHaveAttribute("loop");
    expect(videos[0].muted).toBe(true);
    expect(videos[0]).toHaveAttribute("playsinline");
    expect(videos[0].querySelector("source")).toHaveAttribute("src", "/videos/football-training-night.mp4");
    expect(screen.queryByText(/video 1 of 2/i)).not.toBeInTheDocument();
    expect(videos[0]).toHaveAccessibleName("Homepage sports training video");
    fireEvent.play(videos[0]);
    expect(screen.getByRole("button", { name: /pause homepage sports video/i })).toBeInTheDocument();
    Object.defineProperties(videos[0], {
      currentTime: { configurable: true, value: 9.6 },
      duration: { configurable: true, value: 10 },
    });
    fireEvent.timeUpdate(videos[0]);
    expect(videos[0]).toHaveClass("is-transitioning");
    fireEvent.pause(videos[0]);
    expect(videos[0]).not.toHaveClass("is-transitioning");
    fireEvent.play(videos[0]);
    fireEvent.timeUpdate(videos[0]);
    fireEvent.ended(videos[0]);
    const secondVideo = document.querySelector("video") as HTMLVideoElement;
    expect(secondVideo.querySelector("source")).toHaveAttribute("src", "/videos/football-training-aerial.mp4");
    fireEvent.loadedData(secondVideo);
    expect(secondVideo).not.toHaveClass("is-transitioning");
    expect(screen.getByRole("button", { name: /play homepage sports video/i })).toBeInTheDocument();
    expect(document.querySelector(".hero-primary-card h1")).toHaveTextContent(/find your coach.*reach your next level/i);
    expect(document.body.textContent).not.toMatch(/12 sports|view all 12/i);
    expect(screen.queryByRole("region", { name: /coach results/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view .*profile/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/sample|prototype|fictional|private by default|sample marketplace data/i);
  });

  it("uses Ali's supplied sports photography without presenting athletes as coaches", () => {
    render(<HomePage />);

    expect(screen.getByRole("img", { name: /cricket stadium/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /tennis serve practice/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /football training on the pitch/i })).toBeInTheDocument();
  });

  it("shows all twelve supported sports with a relevant image", () => {
    render(<HomePage />);

    const cards = Array.from(document.querySelectorAll(".sport-card"));
    expect(cards).toHaveLength(12);
    cards.forEach((card) => expect(card.querySelector("img")).toBeInTheDocument());
    expect(cards.map((card) => card.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining("Ice Hockey"),
      expect.stringContaining("Table Tennis"),
      expect.stringContaining("Basketball"),
    ]));
  });

  it("welcomes custom sports instead of presenting a closed catalog", () => {
    render(<HomePage />);

    expect(screen.getByText(/search for any sport/i)).toBeInTheDocument();
    expect(screen.getAllByText(/coaches can add other sports/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /explore all coaching/i })).toHaveAttribute("href", "/coaches");
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
