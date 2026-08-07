"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CoachOwnedSlot, ScheduleBooking, SessionMode } from "@/lib/scheduling";

type Props = { userId: string; approvedCoach: boolean; formats?: { online: boolean; inPerson: boolean } };
type SchedulePayload = { userId: string; bookings: ScheduleBooking[]; slots: CoachOwnedSlot[] };

function when(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(start)} · ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(start)}–${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(end)}`;
}

function statusLabel(value: ScheduleBooking["status"]) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function localDateInput(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function linkedMeetingDetails(value: string) {
  return value.split(/(https?:\/\/[^\s<]+)/gi).map((part, index) => (
    /^https?:\/\//i.test(part)
      ? <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">{part}</a>
      : part
  ));
}

export default function ScheduleManager({ userId, approvedCoach, formats }: Props) {
  const [data, setData] = useState<SchedulePayload>({ userId, bookings: [], slots: [] });
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [mode, setMode] = useState<SessionMode>(() => formats?.inPerson === false && formats.online ? "ONLINE" : "IN_PERSON");
  const [meetingDrafts, setMeetingDrafts] = useState<Record<string, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; body: string }>>({});
  const [paymentForm, setPaymentForm] = useState({ bookingId: "", name: "", card: "", expiry: "", cvc: "" });
  const [now, setNow] = useState(() => Date.now());
  const messageRef = useRef<HTMLParagraphElement>(null);

  const errorRef = useRef<HTMLParagraphElement>(null);

  async function load() {
    try {
      const response = await fetch("/api/schedule", { cache: "no-store", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Schedule unavailable");
      setData({ userId: result.userId, bookings: result.bookings ?? [], slots: result.slots ?? [] });
      setState("ready");
    } catch {
      setState("unavailable");
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/schedule", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Schedule unavailable");
        return result;
      })
      .then((result) => {
        if (!active) return;
        setData({ userId: result.userId, bookings: result.bookings ?? [], slots: result.slots ?? [] });
        setState("ready");
      })
      .catch(() => { if (active) setState("unavailable"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
    else if (message) messageRef.current?.focus();
  }, [error, message]);

  const upcoming = useMemo(() => data.bookings.filter((booking) => booking.status === "REQUESTED" || booking.status === "CONFIRMED"), [data.bookings]);
  const history = useMemo(() => data.bookings.filter((booking) => !upcoming.includes(booking)), [data.bookings, upcoming]);
  const futureSlots = useMemo(() => data.slots.filter((slot) => slot.state === "OPEN" && new Date(slot.endsAt).getTime() >= now), [data.slots, now]);
  const busyAnnouncement = useMemo(() => {
    if (!busyId) return "";
    if (busyId === "new-slot") return "Adding availability.";
    const [id, action] = busyId.split(":");
    const booking = data.bookings.find((item) => item.bookingId === id);
    if (booking && action) {
      const person = booking.coachId === userId ? booking.athleteName : booking.coachName;
      const progress = action === "meeting-details" ? "Saving meeting details for" : ({ accept: "Accepting", decline: "Declining", cancel: "Cancelling", complete: "Completing" } as Record<string, string>)[action] ?? "Updating";
      return `${progress} ${person}, ${when(booking.startsAt, booking.endsAt)}.`;
    }
    const slot = data.slots.find((item) => item.id === busyId);
    return slot ? `Removing availability, ${when(slot.startsAt, slot.endsAt)}.` : "Saving your change.";
  }, [busyId, data.bookings, data.slots, userId]);

  async function createSlot(event: FormEvent) {
    event.preventDefault();
    setMessage(""); setError(""); setBusyId("new-slot");
    const startsAt = new Date(`${date}T${startTime}`);
    const endsAt = new Date(`${date}T${endTime}`);
    if (!date || !startTime || !endTime || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setError("Choose a valid date, start time and end time."); setBusyId(""); return;
    }
    const leadTime = startsAt.getTime() - Date.now();
    const duration = endsAt.getTime() - startsAt.getTime();
    if (leadTime < 30 * 60 * 1000 || leadTime > 180 * 24 * 60 * 60 * 1000 || duration < sessionMinutes * 60 * 1000 || duration > 12 * 60 * 60 * 1000) {
      setError("Choose a future working-hours window at least 30 minutes from now and up to 12 hours long."); setBusyId(""); return;
    }
    try {
      const response = await fetch("/api/schedule/slots", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), mode, sessionMinutes }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The slot could not be saved.");
      setDate(""); setStartTime(""); setEndTime(""); setMessage("Bookable sessions added to your public coach profile.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The slot could not be saved."); }
    finally { setBusyId(""); }
  }

  async function bookingAction(bookingId: string, action: "accept" | "decline" | "cancel" | "complete") {
    const confirmation = action === "decline" ? "Decline this booking request? The athlete will need to request another time."
      : action === "cancel" ? "Cancel this confirmed session? This cannot be undone."
      : action === "complete" ? "Mark this session complete? This cannot be undone."
      : null;
    if (confirmation && !window.confirm(confirmation)) return;
    setMessage(""); setError(""); setBusyId(`${bookingId}:${action}`);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The booking could not be changed.");
      setMessage(action === "accept" ? "Session confirmed." : action === "decline" ? "Request declined and the slot is open again." : action === "complete" ? "Session marked complete." : "Booking cancelled.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The booking could not be changed."); }
    finally { setBusyId(""); }
  }

  async function submitReview(bookingId: string) {
    const draft = reviewDrafts[bookingId] ?? { rating: 5, body: "" };
    setMessage(""); setError(""); setBusyId(`${bookingId}:review`);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "review", rating: draft.rating, review: draft.body }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The review could not be submitted.");
      setMessage("Review submitted."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The review could not be submitted."); }
    finally { setBusyId(""); }
  }

  async function submitDemoPayment(event: FormEvent, bookingId: string) {
    event.preventDefault();
    if (!paymentForm.name.trim() || paymentForm.card.replaceAll(" ", "") !== "4242424242424242" || !/^\d{2}\/\d{2}$/.test(paymentForm.expiry) || !/^\d{3}$/.test(paymentForm.cvc)) {
      setError("For this demo, use test card 4242 4242 4242 4242, any MM/YY expiry and any 3-digit CVC."); return;
    }
    setError(""); setMessage(""); setBusyId(`${bookingId}:demo-payment`);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "demo-payment" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Demo payment could not be recorded.");
      setPaymentForm({ bookingId: "", name: "", card: "", expiry: "", cvc: "" }); setMessage("Demo payment recorded. No real charge was made."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Demo payment could not be recorded."); }
    finally { setBusyId(""); }
  }

  async function removeSlot(slotId: string) {
    if (!window.confirm("Remove this availability? This cannot be undone.")) return;
    setBusyId(slotId); setError(""); setMessage("");
    try {
      const response = await fetch("/api/schedule/slots", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ slotId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The slot could not be removed.");
      setMessage("Availability removed."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The slot could not be removed."); }
    finally { setBusyId(""); }
  }

  async function saveMeetingDetails(bookingId: string, value: string) {
    setMessage(""); setError(""); setBusyId(`${bookingId}:meeting-details`);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "meeting-details", meetingDetails: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Meeting details could not be saved.");
      setMessage("Meeting details shared with the athlete.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Meeting details could not be saved."); }
    finally { setBusyId(""); }
  }

  return (
    <section className="account-schedule" aria-labelledby="schedule-heading">
      <header className="account-section-heading"><div><span>Schedule</span><h2 id="schedule-heading">Your sessions</h2></div><p>Times appear in {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll("_", " ")}.</p></header>
      {state === "loading" && <p role="status">Loading your schedule…</p>}
      {state === "unavailable" && <p role="alert">Your schedule is temporarily unavailable.</p>}
      {error && <p ref={errorRef} tabIndex={-1} className="booking-message error" role="alert">{error}</p>}
      {message && <p ref={messageRef} tabIndex={-1} className="booking-message success" role="status">{message}</p>}
      {busyAnnouncement && <p className="sr-only" role="status">{busyAnnouncement}</p>}

      {state === "ready" && (
        <>
          <div className="schedule-column-grid">
            <div>
              <h3>Upcoming</h3>
              {upcoming.length === 0 ? <p className="schedule-empty">No upcoming sessions yet.</p> : upcoming.map((booking) => {
                const isCoach = booking.coachId === userId;
                const detailsId = `meeting-details-${booking.bookingId}`;
                const meetingDetails = meetingDrafts[booking.bookingId] ?? booking.meetingDetails ?? "";
                return <article className="schedule-booking" key={booking.bookingId}>
                  <div><span className={`schedule-status status-${booking.status.toLowerCase()}`}>{statusLabel(booking.status)}</span><h4>{isCoach ? booking.athleteName : booking.coachName}</h4><p>{when(booking.startsAt, booking.endsAt)} · {booking.mode === "ONLINE" ? "Online" : "In person"}</p></div>
                  <div className="schedule-actions">
                    {isCoach && booking.status === "REQUESTED" && <>{new Date(booking.startsAt).getTime() > now && <button aria-label={`Accept ${booking.athleteName}, ${when(booking.startsAt, booking.endsAt)}`} type="button" disabled={!!busyId} onClick={() => bookingAction(booking.bookingId, "accept")}>Accept</button>}<button aria-label={`Decline ${booking.athleteName}, ${when(booking.startsAt, booking.endsAt)}`} type="button" disabled={!!busyId} onClick={() => bookingAction(booking.bookingId, "decline")}>Decline</button></>}
                    {["REQUESTED", "CONFIRMED"].includes(booking.status) && new Date(booking.endsAt).getTime() > now && <button aria-label={`Cancel session with ${isCoach ? booking.athleteName : booking.coachName}, ${when(booking.startsAt, booking.endsAt)}`} className="is-subtle" type="button" disabled={!!busyId} onClick={() => bookingAction(booking.bookingId, "cancel")}>Cancel</button>}
                    {isCoach && booking.status === "CONFIRMED" && <button aria-label={`Mark session with ${booking.athleteName} completed, ${when(booking.startsAt, booking.endsAt)}`} type="button" disabled={!!busyId} onClick={() => bookingAction(booking.bookingId, "complete")}>Mark completed</button>}
                  </div>
                  {booking.status === "CONFIRMED" && (isCoach ? (
                    <div className="schedule-meeting-details">
                      <label htmlFor={detailsId}>Meeting details for {booking.athleteName}</label>
                      <textarea id={detailsId} rows={2} maxLength={500} value={meetingDetails} onChange={(event) => setMeetingDrafts((current) => ({ ...current, [booking.bookingId]: event.target.value }))} placeholder={booking.mode === "ONLINE" ? "Private meeting link and joining notes" : "Exact meeting point and arrival notes"} />
                      <button aria-label={`Save meeting details for ${booking.athleteName}, ${when(booking.startsAt, booking.endsAt)}`} type="button" disabled={!!busyId || meetingDetails.trim().length < 3} onClick={() => saveMeetingDetails(booking.bookingId, meetingDetails)}>Save meeting details</button>
                    </div>
                  ) : (
                    <div className="schedule-meeting-details"><strong>Meeting details</strong><p>{booking.meetingDetails ? linkedMeetingDetails(booking.meetingDetails) : "The coach has not shared the final meeting details yet."}</p></div>
                  ))}
                  {!isCoach && booking.status === "CONFIRMED" && (booking.paymentStatus === "DEMO_PAID" ? <p><strong>Demo payment recorded</strong> — no real charge was made.</p> : paymentForm.bookingId === booking.bookingId ? <form className="schedule-payment-form" onSubmit={(event) => submitDemoPayment(event, booking.bookingId)}><strong>Demo card payment</strong><p>Placeholder only. Do not enter real card information. Nothing from these fields is sent or stored.</p><label>Name on card<input required autoComplete="off" value={paymentForm.name} onChange={(event) => setPaymentForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Test card number<input required inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={paymentForm.card} onChange={(event) => setPaymentForm((current) => ({ ...current, card: event.target.value }))} /></label><label>Expiry<input required autoComplete="off" placeholder="12/30" value={paymentForm.expiry} onChange={(event) => setPaymentForm((current) => ({ ...current, expiry: event.target.value }))} /></label><label>CVC<input required inputMode="numeric" autoComplete="off" placeholder="123" value={paymentForm.cvc} onChange={(event) => setPaymentForm((current) => ({ ...current, cvc: event.target.value }))} /></label><button type="submit" disabled={!!busyId}>Record demo payment</button><button type="button" className="is-subtle" onClick={() => setPaymentForm({ bookingId: "", name: "", card: "", expiry: "", cvc: "" })}>Cancel</button></form> : <button type="button" className="is-subtle" onClick={() => setPaymentForm({ bookingId: booking.bookingId, name: "", card: "", expiry: "", cvc: "" })}>Open demo payment</button>)}
                </article>;
              })}
            </div>
            <div>
              <h3>History</h3>
              {history.length === 0 ? <p className="schedule-empty">Completed and cancelled sessions will appear here.</p> : history.slice(-8).reverse().map((booking) => {
                const isAthlete = booking.athleteId === userId;
                const draft = reviewDrafts[booking.bookingId] ?? { rating: 5, body: "" };
                return <article className="schedule-booking compact" key={booking.bookingId}><div><span className={`schedule-status status-${booking.status.toLowerCase()}`}>{statusLabel(booking.status)}</span><h4>{booking.coachId === userId ? booking.athleteName : booking.coachName}</h4><p>{when(booking.startsAt, booking.endsAt)}</p>{booking.refundPolicyOutcome !== "NOT_APPLICABLE" && <p>{booking.refundPolicyOutcome === "FULL_REFUND_DUE" ? "Refund policy: eligible for a full refund from the coach." : "Refund policy: outside the full-refund window."}</p>}{booking.reviewRating ? <p><strong>Your verified review:</strong> {"★".repeat(booking.reviewRating)} — {booking.reviewBody}</p> : isAthlete && booking.status === "COMPLETED" ? <div className="schedule-review-form"><label>Rating<select aria-label={`Rating for ${booking.coachName}`} value={draft.rating} onChange={(event) => setReviewDrafts((current) => ({ ...current, [booking.bookingId]: { ...draft, rating: Number(event.target.value) } }))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label><label>Review<textarea aria-label={`Review for ${booking.coachName}`} minLength={10} maxLength={1000} value={draft.body} onChange={(event) => setReviewDrafts((current) => ({ ...current, [booking.bookingId]: { ...draft, body: event.target.value } }))} /></label><button type="button" disabled={!!busyId || draft.body.trim().length < 10} onClick={() => submitReview(booking.bookingId)}>Submit review</button></div> : null}</div></article>;
              })}
            </div>
          </div>

          {approvedCoach && <div className="coach-availability-manager">
            <div><span>Coach tools</span><h3>Add working hours</h3><p>Choose a broad window such as 8:00 AM–5:00 PM. It will be split into separate bookable sessions.</p></div>
            <form onSubmit={createSlot}>
              <label>Date<input type="date" min={localDateInput(new Date(now))} required value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label>Starts<input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
              <label>Ends<input type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
              <label>Session length<select aria-label="Session length" value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value))}><option value={30}>30 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option><option value={120}>2 hours</option><option value={180}>3 hours</option></select></label>
              <label>Format<select value={mode} onChange={(event) => setMode(event.target.value as SessionMode)}>{formats?.inPerson !== false && <option value="IN_PERSON">In person</option>}{formats?.online !== false && <option value="ONLINE">Online</option>}</select></label>
              <button className="button button-accent" disabled={busyId === "new-slot"} type="submit">{busyId === "new-slot" ? "Adding…" : "Add sessions"}</button>
            </form>
            <p className="application-field-hint">Choose a start at least 30 minutes ahead. Windows can last up to 12 hours; athletes book one generated session at a time.</p>
            <div className="coach-slot-list">
              {futureSlots.length === 0 ? <p className="schedule-empty">No future availability added.</p> : futureSlots.map((slot) => <article key={slot.id}><div><strong>{when(slot.startsAt, slot.endsAt)}</strong><span>{slot.mode === "ONLINE" ? "Online" : "In person"}{slot.bookingStatus ? ` · ${slot.bookingStatus.toLowerCase()}` : " · Open"}</span></div><button aria-label={`Remove availability, ${when(slot.startsAt, slot.endsAt)}`} type="button" disabled={!!slot.bookingStatus || busyId === slot.id} onClick={() => removeSlot(slot.id)}>Remove</button></article>)}
            </div>
          </div>}

          <p className="schedule-policy"><strong>Payment is currently a demonstration only; no real money is charged.</strong> Never enter real card information. For direct off-platform payments, athlete cancellations qualify for the full-refund policy until 24 hours before the session; the coach is responsible for issuing any eligible refund.</p>
        </>
      )}
    </section>
  );
}
