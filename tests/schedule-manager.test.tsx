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

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("account schedule manager", () => {
  it("shows athlete and coach schedules with acceptance controls", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "/api/schedule") return Promise.resolve({ ok: true, json: async () => ({ userId, bookings: [booking], slots: [] }) });
      if (String(input).includes("/api/bookings/") && init?.method === "PATCH") return Promise.resolve({ ok: true, json: async () => ({ booking: { ...booking, status: "CONFIRMED" } }) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ScheduleManager userId={userId} approvedCoach />);
    fireEvent.click(await screen.findByRole("button", { name: /sessions \(1\)/i }));

    expect(await screen.findByText("Training Member")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /availability/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /accept training member/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/bookings\//), expect.objectContaining({ method: "PATCH" })));
    expect(await screen.findByText("Session confirmed.")).toBeInTheDocument();
    expect(screen.getByText(/payment and refund records are demonstrations only/i)).toBeInTheDocument();
  });

  it("locks a submitted verified review with no edit or resubmit controls", async () => {
    const reviewed = {
      ...booking,
      status: "COMPLETED",
      startsAt: "2026-08-08T10:00:00.000Z",
      endsAt: "2026-08-08T11:00:00.000Z",
      reviewRating: 5,
      reviewBody: "Excellent coaching session.",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ userId: booking.athleteId, bookings: [reviewed], slots: [] }),
    }));

    render(<ScheduleManager userId={booking.athleteId} approvedCoach={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /^history & reviews/i }));

    const reviewLabel = await screen.findByText(/your verified review/i);
    expect(reviewLabel.closest("p")).toHaveTextContent("★★★★★. Excellent coaching session.");
    expect(screen.queryByRole("button", { name: /submit review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /review for/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /rating for/i })).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: /sessions \(1\)/i }));

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
    fireEvent.click(await screen.findByRole("button", { name: /sessions \(1\)/i }));

    const link = await screen.findByRole("link", { name: "https://meet.example/session" });
    expect(link).toHaveAttribute("href", "https://meet.example/session");
    expect(link).toHaveAttribute("target", "_blank");
    fireEvent.click(screen.getByRole("button", { name: /open demo payment/i }));
    expect(screen.getByText(/do not enter real card information/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("4242 4242 4242 4242")).toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: /sessions \(1\)/i }));

    expect(await screen.findByRole("button", { name: /mark session with training member completed/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("requires confirmation before irreversible schedule changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId, bookings: [booking], slots: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ScheduleManager userId={userId} approvedCoach />);
    fireEvent.click(await screen.findByRole("button", { name: /sessions \(1\)/i }));

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
    fireEvent.click(await screen.findByRole("button", { name: /availability/i }));
    await screen.findByRole("heading", { name: /add working hours/i });

    fireEvent.change(screen.getByLabelText("Date"), { target: { value: localDate(start) } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: localTime(start) } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: localTime(end) } });
    fireEvent.click(screen.getByRole("button", { name: "Add sessions" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/at least 30 minutes from now/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("submits only an approved coach format", async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setHours(12, 0, 0, 0);
    const end = new Date(start);
    end.setHours(13, 0, 0, 0);
    const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    const localTime = (value: Date) => `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => Promise.resolve({ ok: true, json: async () => String(input) === "/api/schedule" ? { userId, bookings: [], slots: [] } : { slot: {} } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ScheduleManager userId={userId} approvedCoach formats={{ online: true, inPerson: false }} />);
    fireEvent.click(await screen.findByRole("button", { name: /availability/i }));
    await screen.findByRole("heading", { name: /add working hours/i });
    expect(screen.queryByRole("option", { name: "In person" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: localDate(start) } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: localTime(start) } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: localTime(end) } });
    fireEvent.click(screen.getByRole("button", { name: "Add sessions" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/schedule/slots", expect.objectContaining({ body: expect.stringContaining('"mode":"ONLINE"') })));
  });

  it("shows payment confirmation to both participants and coach demo earnings totals", async () => {
    const paid = {
      ...booking,
      status: "COMPLETED",
      paymentStatus: "DEMO_PAID",
      startsAt: "2020-08-14T10:00:00.000Z",
      endsAt: "2020-08-14T11:00:00.000Z",
      paymentRecordedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      pricePkr: 3000,
    };
    const retainedLateCancellation = {
      ...booking,
      bookingId: "booking-late-cancel",
      status: "CANCELLED_BY_ATHLETE",
      paymentStatus: "DEMO_PAID",
      pricePkr: 2500,
    };
    const legacyPaidWithoutDate = {
      ...paid,
      bookingId: "booking-legacy-paid",
      paymentRecordedAt: null,
      pricePkr: 2000,
    };
    const fullRefund = {
      ...booking,
      bookingId: "booking-full-refund",
      status: "CANCELLED_BY_ATHLETE",
      paymentStatus: "DEMO_REFUNDED",
      refundPolicyOutcome: "FULL_REFUND_DUE",
      refundedAt: new Date().toISOString(),
      pricePkr: 5600,
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId, bookings: [paid, retainedLateCancellation, legacyPaidWithoutDate, fullRefund], slots: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = render(<ScheduleManager userId={userId} approvedCoach />);
    expect(await screen.findByTestId("earnings-week")).toHaveTextContent("Rs 3,000");
    expect(screen.getByTestId("earnings-month")).toHaveTextContent("Rs 3,000");
    expect(screen.getByTestId("earnings-lifetime")).toHaveTextContent("Rs 5,000");
    expect(screen.getByTestId("earnings-pending")).toHaveTextContent("Rs 0");
    expect(screen.getByTestId("earnings-refunded")).toHaveTextContent("Rs -5,600");
    expect(screen.getByText(/recent periods exclude 1 older demo payment/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^history & reviews/i }));
    expect(screen.getAllByText(/payment confirmed on coachconnect/i)).toHaveLength(3);
    unmount();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId: booking.athleteId, bookings: [paid], slots: [] }) }));
    render(<ScheduleManager userId={booking.athleteId} approvedCoach={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /^history & reviews/i }));
    expect(screen.getByText(/payment confirmed on coachconnect/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("lets an athlete record a late demo payment after completion", async () => {
    const completedUnpaid = {
      ...booking,
      status: "COMPLETED",
      paymentStatus: "NOT_COLLECTED",
      startsAt: "2020-08-14T10:00:00.000Z",
      endsAt: "2020-08-14T11:00:00.000Z",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId: booking.athleteId, bookings: [completedUnpaid], slots: [] }) }));
    render(<ScheduleManager userId={booking.athleteId} approvedCoach={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /^history & reviews/i }));
    fireEvent.click(screen.getByRole("button", { name: /open demo payment/i }));
    expect(screen.getByText(/demo card payment/i)).toBeInTheDocument();
  });

  it("tells the athlete when an eligible demo refund was recorded", async () => {
    const refunded = {
      ...booking,
      status: "CANCELLED_BY_COACH",
      paymentStatus: "DEMO_REFUNDED",
      refundPolicyOutcome: "FULL_REFUND_DUE",
      refundedAt: new Date().toISOString(),
    };
    const newerHistory = Array.from({ length: 9 }, (_, index) => ({
      ...booking,
      bookingId: `newer-history-${index}`,
      status: "COMPLETED",
      paymentStatus: "NOT_COLLECTED",
      startsAt: new Date(Date.now() + index * 1000).toISOString(),
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId: booking.athleteId, bookings: [refunded, ...newerHistory], slots: [] }) }));
    render(<ScheduleManager userId={booking.athleteId} approvedCoach={false} />);
    expect(await screen.findByText(/1 demo refund recorded in your history/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /^history & reviews/i }));
    expect(screen.getByText(/demo refund recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/no real money was moved/i)).toBeInTheDocument();
  });

  it("announces an automatically recorded demo refund immediately after cancellation", async () => {
    const confirmedPaid = { ...booking, status: "CONFIRMED", paymentStatus: "DEMO_PAID" };
    const refunded = { ...confirmedPaid, status: "CANCELLED_BY_ATHLETE", paymentStatus: "DEMO_REFUNDED" };
    let scheduleCalls = 0;
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => {
      if (String(input) === "/api/schedule") {
        scheduleCalls += 1;
        return Promise.resolve({ ok: true, json: async () => ({ userId: booking.athleteId, bookings: scheduleCalls === 1 ? [confirmedPaid] : [refunded], slots: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ booking: { payment_status: "DEMO_REFUNDED", price_pkr: 3000 } }) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ScheduleManager userId={booking.athleteId} approvedCoach={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /sessions \(1\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel session with/i }));
    expect(await screen.findByText(/demo refund recorded for rs 3,000/i)).toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: /sessions \(1\)/i }));

    const accept = await screen.findByRole("button", { name: /accept training member.*aug 14/i });
    fireEvent.click(accept);
    expect(screen.getByRole("status")).toHaveTextContent(/accepting training member/i);
    resolveAction?.({ ok: true, json: async () => ({ booking: { ...booking, status: "CONFIRMED" } }) });
    await waitFor(() => expect(screen.getByText("Session confirmed.")).toHaveFocus());
  });
});
