export type BookingStatus = "REQUESTED" | "CONFIRMED" | "DECLINED" | "CANCELLED_BY_ATHLETE" | "CANCELLED_BY_COACH" | "COMPLETED" | "EXPIRED";
export type SessionMode = "ONLINE" | "IN_PERSON";

export type PublicCoachSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  mode: SessionMode;
};

export type ScheduleBooking = PublicCoachSlot & {
  bookingId: string;
  coachId: string;
  athleteId: string;
  coachName: string;
  athleteName: string;
  status: BookingStatus;
  pricePkr: number;
  paymentStatus: "NOT_COLLECTED";
  athleteNote: string | null;
  cancellationNote: string | null;
  meetingDetails: string | null;
  refundPolicyOutcome: "NOT_APPLICABLE" | "FULL_REFUND_DUE" | "OUTSIDE_FULL_REFUND_WINDOW";
};

export type CoachOwnedSlot = PublicCoachSlot & {
  state: "OPEN" | "CANCELLED";
  bookingStatus: "REQUESTED" | "CONFIRMED" | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function publicSlot(row: Record<string, unknown>): PublicCoachSlot | null {
  const id = text(row.slot_id || row.id);
  const startsAt = text(row.starts_at);
  const endsAt = text(row.ends_at);
  const mode = row.session_mode;
  if (!id || !startsAt || !endsAt || (mode !== "ONLINE" && mode !== "IN_PERSON")) return null;
  return { id, startsAt, endsAt, mode };
}

export function scheduleBooking(row: Record<string, unknown>): ScheduleBooking | null {
  const slot = publicSlot(row);
  const bookingId = text(row.booking_id);
  const coachId = text(row.coach_user_id);
  const athleteId = text(row.athlete_user_id);
  const status = row.status;
  const statuses: BookingStatus[] = ["REQUESTED", "CONFIRMED", "DECLINED", "CANCELLED_BY_ATHLETE", "CANCELLED_BY_COACH", "COMPLETED", "EXPIRED"];
  const refundPolicyOutcome = row.refund_policy_outcome;
  const refundOutcomes: ScheduleBooking["refundPolicyOutcome"][] = ["NOT_APPLICABLE", "FULL_REFUND_DUE", "OUTSIDE_FULL_REFUND_WINDOW"];
  if (!slot || !bookingId || !coachId || !athleteId || !statuses.includes(status as BookingStatus)) return null;
  return {
    ...slot,
    bookingId,
    coachId,
    athleteId,
    coachName: text(row.coach_name) || "Coach",
    athleteName: text(row.athlete_name) || "Athlete",
    status: status as BookingStatus,
    pricePkr: typeof row.price_pkr === "number" ? row.price_pkr : 0,
    paymentStatus: "NOT_COLLECTED",
    athleteNote: typeof row.athlete_note === "string" ? row.athlete_note : null,
    cancellationNote: typeof row.cancellation_note === "string" ? row.cancellation_note : null,
    meetingDetails: typeof row.meeting_details === "string" ? row.meeting_details : null,
    refundPolicyOutcome: refundOutcomes.includes(refundPolicyOutcome as ScheduleBooking["refundPolicyOutcome"])
      ? refundPolicyOutcome as ScheduleBooking["refundPolicyOutcome"]
      : "NOT_APPLICABLE",
  };
}

export function ownedSlot(row: Record<string, unknown>): CoachOwnedSlot | null {
  const slot = publicSlot(row);
  if (!slot || (row.state !== "OPEN" && row.state !== "CANCELLED")) return null;
  const bookingStatus = row.booking_status === "REQUESTED" || row.booking_status === "CONFIRMED" ? row.booking_status : null;
  return { ...slot, state: row.state, bookingStatus };
}
