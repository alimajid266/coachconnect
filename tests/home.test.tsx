import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

describe("CoachConnect home page", () => {
  it("explains the marketplace and shows the focused Pakistan offering", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /train smarter.*play bolder/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pakistan's coaching marketplace/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cricket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tennis/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /strength/i })).toBeInTheDocument();
    expect(screen.getByText(/recommended coaches/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rs\s[0-9,]+/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/exact meeting locations.*stay private/i)).toBeInTheDocument();
  });

  it("presents an energetic Pakistan-focused visual identity", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /train smarter.*play bolder/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/one-to-one coaching.*built around you/i)).toBeInTheDocument();
    expect(screen.getByText(/karachi.*lahore.*islamabad/i)).toBeInTheDocument();
    expect(screen.getByText(/3 focused sports/i)).toBeInTheDocument();
  });

  it("shows six coach profiles across the focused sports", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("button", { name: /view .*'s profile/i })).toHaveLength(6);
    expect(screen.getAllByText(/Lahore|Karachi|Islamabad/i).length).toBeGreaterThanOrEqual(6);
  });

  it("filters the visible coaches when an athlete chooses a sport", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /cricket/i }));

    expect(screen.getByRole("heading", { name: "Ayesha Khan" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hamza Siddiqui" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sara Ahmed" })).not.toBeInTheDocument();
  });

  it("submits ordinary sport and city search without reloading", () => {
    render(<HomePage />);

    fireEvent.change(screen.getByRole("textbox", { name: /what do you need/i }), {
      target: { value: "tennis" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /city/i }), {
      target: { value: "karachi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find coaches/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/1 coach.*tennis.*karachi/i);
    expect(screen.getByRole("heading", { name: "Hamza Siddiqui" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ayesha Khan" })).not.toBeInTheDocument();
  });

  it("interprets natural-language sport, city, level and budget filters", () => {
    render(<HomePage />);

    fireEvent.change(screen.getByRole("textbox", { name: /what do you need/i }), {
      target: { value: "beginner tennis coach in Karachi under Rs 4,500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find coaches/i }));

    const filters = screen.getByRole("region", { name: /interpreted search filters/i });
    expect(within(filters).getByText("Tennis")).toBeInTheDocument();
    expect(within(filters).getByText("Karachi")).toBeInTheDocument();
    expect(within(filters).getByText("Beginner")).toBeInTheDocument();
    expect(within(filters).getByText("Up to Rs 4,500")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/1 coach/i);
    expect(screen.getByRole("heading", { name: "Hamza Siddiqui" })).toBeInTheDocument();
  });

  it("lets athletes remove an interpreted filter to broaden results", () => {
    render(<HomePage />);

    fireEvent.change(screen.getByRole("textbox", { name: /what do you need/i }), {
      target: { value: "online tennis in Islamabad under Rs 3,000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find coaches/i }));

    expect(screen.getByRole("heading", { name: "Omar Farooq" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sara Ahmed" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove tennis filter/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/2 coaches/i);
    expect(screen.getByRole("heading", { name: "Omar Farooq" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sara Ahmed" })).toBeInTheDocument();
  });

  it("interprets delivery mode, minimum rating and availability", () => {
    render(<HomePage />);

    fireEvent.change(screen.getByRole("textbox", { name: /what do you need/i }), {
      target: { value: "online strength coach rated 4.7 available Wednesday under Rs 3,500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find coaches/i }));

    const filters = screen.getByRole("region", { name: /interpreted search filters/i });
    expect(within(filters).getByText("Strength")).toBeInTheDocument();
    expect(within(filters).getByText("Online")).toBeInTheDocument();
    expect(within(filters).getByText("4.7+ rating")).toBeInTheDocument();
    expect(within(filters).getByText("Wednesday")).toBeInTheDocument();
    expect(within(filters).getByText("Up to Rs 3,500")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sara Ahmed" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/1 coach/i);
  });

  it("opens a private, clear service profile from a coach card", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));

    expect(screen.getByRole("dialog", { name: /ayesha khan/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what's included/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what to bring/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /facilities/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /not included/i })).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    expect(screen.queryByText(/exact home address/i)).not.toBeInTheDocument();
  });

  it("shows selectable weekly availability before the account handoff", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /view ayesha khan's profile/i }));
    expect(screen.getByRole("heading", { name: /weekly availability/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select saturday at 10:00 am/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/saturday.*10:00 am selected/i);
    expect(screen.getByRole("link", { name: /sign in to reserve/i })).toHaveAttribute("href", "/account");
  });

  it("presents production-ready navigation and complete service availability", () => {
    render(<HomePage />);

    expect(document.body).not.toHaveTextContent(/\b(sample|phase\s*\d+|demo preview)\b/i);
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute("href", "/account");
    const applicationLinks = screen.getAllByRole("link", { name: /coach applications/i });
    expect(applicationLinks.some((link) => link.getAttribute("href") === "#become-a-coach")).toBe(true);
    expect(applicationLinks.some((link) => link.getAttribute("href") === "/account")).toBe(true);
    expect(screen.getByRole("link", { name: /find a coach/i })).toHaveAttribute("href", "#coaches");
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute("href", "#how-it-works");

    fireEvent.click(screen.getByRole("button", { name: /view sara ahmed's profile/i }));

    expect(screen.getByText(/60 minutes.*online/i)).toBeInTheDocument();
    expect(screen.getByText(/video-call link/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /weekly availability/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select monday at 10:00 am/i })).toBeEnabled();
    expect(screen.getByText(/coachconnect does not collect money or issue refunds/i)).toBeInTheDocument();
  });

  it("closes the profile with its close control and backdrop", () => {
    render(<HomePage />);

    const trigger = screen.getByRole("button", { name: /view ayesha khan's profile/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: /close coach profile/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog.parentElement).not.toBeNull();
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens and closes the mobile navigation", () => {
    render(<HomePage />);

    const openMenu = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(openMenu);

    const closeMenu = screen.getByRole("button", { name: /close navigation menu/i });
    expect(closeMenu).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(closeMenu);
    expect(screen.getByRole("button", { name: /open navigation menu/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("smoothly scrolls section navigation and closes the mobile menu", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    fireEvent.click(screen.getByRole("link", { name: /find a coach/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByRole("button", { name: /open navigation menu/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("uses one Find a Coach navigation action without a duplicate Search coaches button", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /^find a coach$/i })).toHaveAttribute("href", "#coaches");
    expect(screen.queryByRole("link", { name: /search coaches/i })).not.toBeInTheDocument();
  });

  it("moves focus into the profile and restores it after Escape", () => {
    render(<HomePage />);

    const trigger = screen.getByRole("button", { name: /view ayesha khan's profile/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("button", { name: /close coach profile/i })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: /ayesha khan/i })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
