import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("CoachConnect home page", () => {
  it("explains the marketplace and shows the focused Pakistan offering", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /find the right coach\. reach your next goal\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sports coaching across pakistan/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cricket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tennis/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /strength/i })).toBeInTheDocument();
    expect(screen.getByText(/sample coach profiles/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rs\s[0-9,]+/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/exact meeting locations.*stay private/i)).toBeInTheDocument();
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

    expect(screen.getByRole("status")).toHaveTextContent(/1 sample coach.*tennis.*karachi/i);
    expect(screen.getByRole("heading", { name: "Hamza Siddiqui" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ayesha Khan" })).not.toBeInTheDocument();
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

  it("labels preview data honestly and keeps future-phase actions non-interactive", () => {
    render(<HomePage />);

    expect(screen.getByText(/sample profiles.*not real coaches or reviews/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in.*phase 2/i })).toBeDisabled();
    for (const button of screen.getAllByRole("button", { name: /coach applications.*phase 2/i })) {
      expect(button).toBeDisabled();
    }

    fireEvent.click(screen.getByRole("button", { name: /view sara ahmed's profile/i }));

    expect(screen.getByText(/60 minutes.*online/i)).toBeInTheDocument();
    expect(screen.getByText(/video-call link/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /availability.*phase 4/i })).toBeDisabled();
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
