import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScheduleManager from "@/components/schedule-manager";

const userId = "11111111-1111-4111-8111-111111111111";
const booking = {
  id: "22222222-2222-4222-8222-222222222222",
  bookingId: "33333333-3333-4333-8333-333333333333",
  coachId: userId,
  athleteId: "44444444-4444-4444-8444-444444444444",
  coachName: "Ali Majid2",
  athleteName: "Training Member",
  startsAt: "2099-08-14T10:00:00.000Z",
  endsAt: "2099-08-14T11:00:00.000Z",
  mode: "IN_PERSON",
  status: "REQUESTED",
  pricePkr: 3000,
  paymentStatus: "NOT_COLLECTED",
  athleteNote: null,
  cancellationNote: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("account schedule manager", () => {
  it("shows athlete and coach schedules with acceptance controls", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "/api/schedule") return Promise.resolve({ ok: true, json: async () => ({ userId, bookings: [booking], slots: [] }) });
      if (String(input).includes("/api/bookings/") && init?.method === "PATCH") return Promise.resolve({ ok: true, json: async () => ({ booking: { ...booking, status: "CONFIRMED" } }) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ScheduleManager userId={userId} approvedCoach />);

    expect(await screen.findByText("Training Member")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add availability/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /accept training member/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/bookings\//), expect.objectContaining({ method: "PATCH" })));
    expect(await screen.findByText("Session confirmed.")).toBeInTheDocument();
    expect(screen.getByText(/no payments are collected by coachconnect yet/i)).toBeInTheDocument();
  });

  it("lets a coach share participant-only details after confirmation", async () => {
    const confirmed = { ...booking, status: "CONFIRMED", meetingDetails: null };
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "/api/schedule") return Promise.resolve({ ok: true, json: async () => ({ userId, bookings: [confirmed], slots: [] }) });
      if (String(input).includes("/api/bookings/") && init?.method === "PATCH") return Promise.resolve({ ok: true, json: async () => ({ booking: { ...confirmed, meetingDetails: "Meet beside the F-7 community court gate." } }) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ScheduleManager userId={userId} approvedCoach />);

    const details = await screen.findByRole("textbox", { name: /meeting details for training member/i });
    fireEvent.change(details, { target: { value: "Meet beside the F-7 community court gate." } });
    fireEvent.click(screen.getByRole("button", { name: /save meeting details/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/bookings\//), expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining("meeting-details"),
    })));
  });

  it("shows safe clickable meeting links only in a confirmed athlete schedule", async () => {
    const athleteId = booking.athleteId;
    const confirmed = { ...booking, status: "CONFIRMED", meetingDetails: "Join at https://meet.example/session" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId: athleteId, bookings: [confirmed], slots: [] }) }));

    render(<ScheduleManager userId={athleteId} approvedCoach={false} />);

    const link = await screen.findByRole("link", { name: "https://meet.example/session" });
    expect(link).toHaveAttribute("href", "https://meet.example/session");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("keeps an ended confirmed session actionable for its coach", async () => {
    const ended = {
      ...booking,
      status: "CONFIRMED",
      startsAt: "2020-08-14T10:00:00.000Z",
      endsAt: "2020-08-14T11:00:00.000Z",
      meetingDetails: "Training complete",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId, bookings: [ended], slots: [] }) }));

    render(<ScheduleManager userId={userId} approvedCoach />);

    expect(await screen.findByRole("button", { name: /complete session with training member/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("requires confirmation before irreversible schedule changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId, bookings: [booking], slots: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ScheduleManager userId={userId} approvedCoach />);

    fireEvent.click(await screen.findByRole("button", { name: /decline training member/i }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/decline this booking request/i));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains the scheduling window before sending an invalid slot", async () => {
    const start = new Date(Date.now() + 10 * 60 * 1000);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    const localTime = (value: Date) => `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId, bookings: [], slots: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ScheduleManager userId={userId} approvedCoach />);
    await screen.findByRole("heading", { name: /add availability/i });

    fireEvent.change(screen.getByLabelText("Date"), { target: { value: localDate(start) } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: localTime(start) } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: localTime(end) } });
    fireEvent.click(screen.getByRole("button", { name: "Add time" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/at least 30 minutes from now/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("submits only an approved coach format", async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    const localTime = (value: Date) => `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({ ok: true, json: async () => String(input) === "/api/schedule" ? { userId, bookings: [], slots: [] } : { slot: {} } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ScheduleManager userId={userId} approvedCoach formats={{ online: true, inPerson: false }} />);
    await screen.findByRole("heading", { name: /add availability/i });
    expect(screen.queryByRole("option", { name: "In person" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: localDate(start) } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: localTime(start) } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: localTime(end) } });
    fireEvent.click(screen.getByRole("button", { name: "Add time" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/schedule/slots", expect.objectContaining({ body: expect.stringContaining('"mode":"ONLINE"') })));
  });

  it("gives repeated actions contextual names and announces progress", async () => {
    let resolveAction: ((value: { ok: boolean; json: () => Promise<unknown> }) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "/api/schedule") return Promise.resolve({ ok: true, json: async () => ({ userId, bookings: [booking], slots: [] }) });
      if (String(input).includes("/api/bookings/") && init?.method === "PATCH") return new Promise((resolve) => { resolveAction = resolve; });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ScheduleManager userId={userId} approvedCoach />);

    const accept = await screen.findByRole("button", { name: /accept training member.*aug 14/i });
    fireEvent.click(accept);
    expect(screen.getByRole("status")).toHaveTextContent(/accepting training member/i);
    resolveAction?.({ ok: true, json: async () => ({ booking: { ...booking, status: "CONFIRMED" } }) });
    await waitFor(() => expect(screen.getByText("Session confirmed.")).toHaveFocus());
  });
});
