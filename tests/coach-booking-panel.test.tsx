import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CoachBookingPanel from "@/components/coach-booking-panel";

const slot = {
  id: "46de79b9-e598-4a71-988c-00f3136ca353",
  startsAt: "2099-08-14T10:00:00.000Z",
  endsAt: "2099-08-14T11:00:00.000Z",
  mode: "ONLINE" as const,
};

afterEach(() => vi.unstubAllGlobals());

describe("coach booking panel", () => {
  it("provides visible keyboard focus for hidden time radios and an AA blue accent", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/--coral:\s*#2563eb/i);
    expect(css).toMatch(/\.coach-slot-picker label:focus-within\s*\{[^}]+(?:outline|box-shadow)/i);
  });
  it("keeps Demo profiles visibly non-bookable", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CoachBookingPanel coachId="ayesha-khan" coachName="Ayesha Khan" isDemo pricePkr={3500} />);

    expect(screen.getByText(/illustrative and cannot receive real booking requests/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse real coaches/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows real slots and sends a pending request", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes("/availability")) return Promise.resolve({ ok: true, json: async () => ({ slots: [slot] }) });
      if (String(input) === "/api/auth/session") return Promise.resolve({ ok: true, json: async () => ({ user: { id: "athlete-1" } }) });
      if (String(input) === "/api/bookings" && init?.method === "POST") return Promise.resolve({ ok: true, status: 201, json: async () => ({ message: "Request sent" }) });
      return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CoachBookingPanel coachId="82851394-6f65-4ee7-a80c-fc98c28e65ec" coachName="Ali Majid2" isDemo={false} pricePkr={3000} />);

    const option = await screen.findByRole("radio");
    fireEvent.click(option);
    fireEvent.click(screen.getByRole("button", { name: /request session/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/bookings", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByText(/coach must accept it before the session is confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/coach must accept it before the session is confirmed/i)).toHaveFocus();
    expect(screen.getByText(/no payment is collected/i)).toBeInTheDocument();
  });

  it("shows anonymous visitors a safe sign-in return link", async () => {
    const coachId = "82851394-6f65-4ee7-a80c-fc98c28e65ec";
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input).includes("/availability")) return Promise.resolve({ ok: true, json: async () => ({ slots: [slot] }) });
      if (String(input) === "/api/auth/session") return Promise.resolve({ ok: true, json: async () => ({ user: null }) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CoachBookingPanel coachId={coachId} coachName="Ali Majid2" isDemo={false} pricePkr={3000} />);

    const link = await screen.findByRole("link", { name: /sign in to request/i });
    expect(link).toHaveAttribute("href", `/account?next=${encodeURIComponent(`/coaches/${coachId}`)}`);
    expect(fetchMock).not.toHaveBeenCalledWith("/api/bookings", expect.anything());
  });

  it("replaces booking controls with schedule management on the coach's own profile", async () => {
    const coachId = "82851394-6f65-4ee7-a80c-fc98c28e65ec";
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input).includes("/availability")) return Promise.resolve({ ok: true, json: async () => ({ slots: [slot] }) });
      if (String(input) === "/api/auth/session") return Promise.resolve({ ok: true, json: async () => ({ user: { id: coachId } }) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CoachBookingPanel coachId={coachId} coachName="Ali Majid2" isDemo={false} pricePkr={3000} />);

    expect(await screen.findByRole("heading", { name: /manage your schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open my schedule/i })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("button", { name: /request session/i })).not.toBeInTheDocument();
  });
});
