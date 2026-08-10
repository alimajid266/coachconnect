"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PublicCoachSlot, ScheduleBooking } from "@/lib/scheduling";

type Props = {
  coachId: string;
  coachName: string;
  isDemo: boolean;
  pricePkr: number;
};

function slotLabel(slot: PublicCoachSlot) {
  const start = new Date(slot.startsAt);
  const end = new Date(slot.endsAt);
  return `${new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(start)} · ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(start)}–${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(end)}`;
}

export default function CoachBookingPanel({ coachId, coachName, isDemo, pricePkr }: Props) {
  const [slots, setSlots] = useState<PublicCoachSlot[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "unavailable">(isDemo ? "ready" : "loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<"checking" | "owner" | "member" | "anonymous">(isDemo ? "anonymous" : "checking");
  const [ownerSessions, setOwnerSessions] = useState<ScheduleBooking[]>([]);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    fetch(`/api/coaches/${encodeURIComponent(coachId)}/availability`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Schedule unavailable");
        if (active) {
          setSlots(Array.isArray(result.slots) ? result.slots : []);
          setState("ready");
        }
      })
      .catch(() => { if (active) setState("unavailable"); });
    return () => { active = false; };
  }, [coachId, isDemo]);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json();
        if (active) setViewer(result.user?.id === coachId ? "owner" : result.user?.id ? "member" : "anonymous");
      })
      .catch(() => { if (active) setViewer("member"); });
    return () => { active = false; };
  }, [coachId, isDemo]);

  useEffect(() => {
    if (viewer !== "owner") return;
    let active = true;
    fetch("/api/schedule", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error("Schedule unavailable");
        return result;
      })
      .then((result) => {
        if (!active) return;
        const bookings = Array.isArray(result.bookings) ? result.bookings as ScheduleBooking[] : [];
        setOwnerSessions(bookings.filter((booking) => booking.coachId === coachId && ["REQUESTED", "CONFIRMED"].includes(booking.status)));
      })
      .catch(() => { if (active) setOwnerSessions([]); });
    return () => { active = false; };
  }, [coachId, viewer]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
    else if (message) messageRef.current?.focus();
  }, [error, message]);

  async function requestSession() {
    if (!selectedId) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotId: selectedId }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setViewer("anonymous");
        setError("Your sign-in session expired. Sign in again to request this time.");
        return;
      }
      if (!response.ok) throw new Error(result.error || "The request could not be sent.");
      setSlots((current) => current.filter((slot) => slot.id !== selectedId));
      setSelectedId("");
      setMessage("Request sent. The coach must accept it before the session is confirmed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  if (isDemo) {
    return (
      <section className="coach-booking-panel coach-booking-panel-demo" aria-label="Demo booking information">
        <span className="coach-booking-kicker">Demo profile</span>
        <h2>Explore the experience</h2>
        <p>This profile is illustrative and cannot receive real booking requests.</p>
        <Link className="button button-primary" href="/coaches">Browse real coaches</Link>
      </section>
    );
  }

  if (viewer === "owner") {
    return (
      <section className="coach-booking-panel" aria-label="Your coach profile schedule">
        <span className="coach-booking-kicker">Your public profile</span>
        <h2>Manage your schedule</h2>
        <p>New athlete requests and confirmed sessions appear here and in your Sessions workspace.</p>
        {ownerSessions.length > 0 ? (
          <div className="coach-profile-session-status" aria-label="Active session statuses">
            {ownerSessions.slice(0, 3).map((booking) => (
              <div key={booking.bookingId}>
                <strong>{booking.athleteName}</strong>
                <span className={`schedule-status status-${booking.status.toLowerCase()}`}>{booking.status === "REQUESTED" ? "Requested" : "Confirmed"}</span>
              </div>
            ))}
          </div>
        ) : <p className="coach-profile-session-empty">No active booking requests.</p>}
        <Link className="button button-primary" href="/sessions">Open sessions</Link>
      </section>
    );
  }

  return (
    <section className="coach-booking-panel" aria-labelledby="booking-heading">
      <div className="coach-booking-price"><strong>Rs {pricePkr.toLocaleString()}</strong><span> / session</span></div>
      <h2 id="booking-heading">Book with {coachName.split(" ")[0]}</h2>
      {state === "loading" && <p role="status">Loading available times…</p>}
      {state === "unavailable" && <p role="alert">The live schedule is temporarily unavailable.</p>}
      {state === "ready" && slots.length === 0 && <p>No bookable times are available yet. Check again after the coach adds slots.</p>}
      {slots.length > 0 && (
        <fieldset className="coach-slot-picker">
          <legend>Choose a time</legend>
          {slots.slice(0, 12).map((slot) => (
            <label key={slot.id} className={selectedId === slot.id ? "is-selected" : ""}>
              <input type="radio" name="coach-slot" value={slot.id} checked={selectedId === slot.id} onChange={() => setSelectedId(slot.id)} />
              <span>{slotLabel(slot)}<small>{slot.mode === "ONLINE" ? "Online" : "In person"}</small></span>
            </label>
          ))}
        </fieldset>
      )}
      {error && <p ref={errorRef} tabIndex={-1} className="booking-message error" role="alert">{error}</p>}
      {message && <p ref={messageRef} tabIndex={-1} className="booking-message success" role="status">{message}</p>}
      {busy && <p className="sr-only" role="status">Sending the booking request for the selected time.</p>}
      {slots.length > 0 && (viewer === "anonymous"
        ? <Link className="button button-accent coach-request-button" href={`/account?next=${encodeURIComponent(`/coaches/${coachId}`)}`}>Sign in to request</Link>
        : <button className="button button-accent coach-request-button" type="button" disabled={!selectedId || busy || viewer === "checking"} onClick={requestSession}>{busy ? "Sending request…" : "Request session"}</button>)}
      <div className="coach-booking-policy">
        <strong>No payment is collected in this release.</strong>
        <span>Requests need coach approval. For future direct payments, cancellations qualify for the full-refund policy until 24 hours before the session; the coach remains responsible for issuing any refund.</span>
      </div>
    </section>
  );
}
