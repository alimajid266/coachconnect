"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SiteLogo from "@/components/site-logo";

export type SessionUser = {
  id: string | number;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  role: "ATHLETE" | "COACH" | "ADMIN";
  capabilities?: {
    administrator: boolean;
    coachStatus: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | null;
    coachFormats?: { online: boolean; inPerson: boolean } | null;
  };
};

type SessionState =
  | { status: "loading"; user: null }
  | { status: "ready"; user: SessionUser | null }
  | { status: "unavailable"; user: null };

type SiteHeaderProps = {
  initialSession?: { user: SessionUser | null };
  onSessionResolved?: (user: SessionUser | null, status: "ready" | "unavailable") => void;
  hideCoachDiscoveryLink?: boolean;
};

const MAX_SEEN_SESSION_NOTIFICATIONS = 128;

function opaqueFingerprint(value: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

function notificationStorageKey(userId: string | number) {
  return `coachconnect:seen-session-notifications:v2:a-${opaqueFingerprint(`account:${String(userId)}`)}`;
}

function notificationToken(kind: "request" | "meeting-details", bookingId: string) {
  return `n-${opaqueFingerprint(`${kind}:${bookingId}`)}`;
}

function readSeenNotifications(storageKey: string) {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && /^n-[a-z0-9-]{1,40}$/.test(value)).slice(-MAX_SEEN_SESSION_NOTIFICATIONS)
      : [];
  } catch {
    return [];
  }
}

export default function SiteHeader({ initialSession, onSessionResolved, hideCoachDiscoveryLink = false }: SiteHeaderProps = {}) {
  const [session, setSession] = useState<SessionState>(
    initialSession
      ? { status: "ready", user: initialSession.user }
      : { status: "loading", user: null },
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionNotificationCount, setSessionNotificationCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuError, setMenuError] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const sessionNotificationKeysRef = useRef<string[]>([]);
  const sessionUserId = session.status === "ready" ? session.user?.id : null;

  useEffect(() => {
    if (initialSession) return;
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session unavailable");
        return response.json() as Promise<{ user: SessionUser | null }>;
      })
      .then((result) => {
        if (active) {
          setSession({ status: "ready", user: result.user });
          onSessionResolved?.(result.user, "ready");
        }
      })
      .catch(() => {
        if (active) {
          setSession({ status: "unavailable", user: null });
          onSessionResolved?.(null, "unavailable");
        }
      });
    return () => { active = false; };
  }, [initialSession, onSessionResolved]);

  useEffect(() => {
    if (session.status !== "ready" || sessionUserId == null) return;
    let active = true;
    const storageKey = notificationStorageKey(sessionUserId);
    try {
      window.localStorage.removeItem(`coachconnect:seen-session-notifications:${sessionUserId}`);
    } catch {
      // Ignore unavailable private storage while continuing to show in-page notifications.
    }
    const loadNotifications = () => {
      fetch("/api/schedule", { credentials: "same-origin", cache: "no-store" })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error("Schedule unavailable");
          return result;
        })
        .then((result) => {
          if (!active || String(result.userId) !== String(sessionUserId)) return;
          const bookings = Array.isArray(result.bookings) ? result.bookings as Array<{
            bookingId?: string;
            coachId?: string;
            athleteId?: string;
            status?: string;
            meetingDetails?: string | null;
          }> : [];
          const notificationKeys = bookings.flatMap((booking) => {
            if (!booking.bookingId) return [];
            if (String(booking.coachId) === String(sessionUserId) && booking.status === "REQUESTED") {
              return [notificationToken("request", booking.bookingId)];
            }
            if (
              String(booking.athleteId) === String(sessionUserId)
              && booking.status === "CONFIRMED"
              && typeof booking.meetingDetails === "string"
              && booking.meetingDetails.trim().length > 0
            ) {
              return [notificationToken("meeting-details", booking.bookingId)];
            }
            return [];
          }).slice(-MAX_SEEN_SESSION_NOTIFICATIONS);
          sessionNotificationKeysRef.current = notificationKeys;
          const seenKeys = new Set(readSeenNotifications(storageKey));
          setSessionNotificationCount(notificationKeys.filter((key) => !seenKeys.has(key)).length);
        })
        .catch(() => { if (active) setSessionNotificationCount(0); });
    };
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30_000);
    window.addEventListener("focus", loadNotifications);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [session.status, sessionUserId]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function logOut() {
    setLoggingOut(true);
    setMenuError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Logout failed");
      if (sessionUserId != null) {
        try {
          window.localStorage.removeItem(notificationStorageKey(sessionUserId));
          window.localStorage.removeItem(`coachconnect:seen-session-notifications:${sessionUserId}`);
        } catch {
          // Logout must still complete when private storage is unavailable.
        }
      }
      setSession({ status: "ready", user: null });
      sessionNotificationKeysRef.current = [];
      setSessionNotificationCount(0);
      setMenuOpen(false);
      onSessionResolved?.(null, "ready");
    } catch {
      setMenuError("Unable to log out. Try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  function markSessionNotificationsRead() {
    if (sessionUserId == null) return;
    try {
      const storageKey = notificationStorageKey(sessionUserId);
      const mergedKeys = Array.from(new Set([
        ...readSeenNotifications(storageKey),
        ...sessionNotificationKeysRef.current,
      ])).slice(-MAX_SEEN_SESSION_NOTIFICATIONS);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(mergedKeys),
      );
    } catch {
      // The badge still clears for this page when private storage is unavailable.
    }
    setSessionNotificationCount(0);
  }

  const coachStatus = session.user?.capabilities?.coachStatus
    ?? (session.user?.role === "COACH" ? "APPROVED" : null);
  const coachHref = session.user ? "/coach/apply" : "/account?next=%2Fcoach%2Fapply";
  const coachLabel = coachStatus === "APPROVED" ? "Coach profile" : "Become a coach";
  const initials = session.user?.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AC";
  const isAdministrator = session.user?.capabilities?.administrator ?? session.user?.role === "ADMIN";

  return (
    <header className="site-header">
      <nav className="container global-nav" aria-label="Main navigation">
        <SiteLogo />
        <div className="global-nav-links">
          {!hideCoachDiscoveryLink && <Link href="/coaches">Find a coach</Link>}
          {session.status === "loading" ? (
            <span className="nav-session-state" aria-live="polite">Checking account…</span>
          ) : session.status === "unavailable" ? (
            <Link className="nav-account" href="/account">My account</Link>
          ) : session.user ? (
            <>
              <nav className="nav-workspace-shortcuts" aria-label="Workspace shortcuts">
                <Link
                  className="nav-sessions-link"
                  href="/sessions"
                  aria-label={sessionNotificationCount > 0 ? `Sessions, ${sessionNotificationCount} ${sessionNotificationCount === 1 ? "update" : "updates"}` : "Sessions"}
                  onClick={markSessionNotificationsRead}
                >
                  Sessions
                  {sessionNotificationCount > 0 && <span className="nav-session-badge" data-testid="sessions-notification" aria-hidden="true">{sessionNotificationCount > 9 ? "9+" : sessionNotificationCount}</span>}
                </Link>
                <Link href="/training-plans">Plans</Link>
                <Link href="/recommendations">Recommendation settings</Link>
              </nav>
              <div className="nav-account-menu" ref={accountMenuRef}>
              <button
                className="nav-account-trigger"
                type="button"
                aria-label={`Open account menu for ${session.user.displayName}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => { setMenuOpen((open) => !open); setMenuError(""); }}
              >
                {session.user.avatarUrl
                  ? <img aria-hidden="true" alt="" src={session.user.avatarUrl} />
                  : <span aria-hidden="true">{initials}</span>}
              </button>
              <div
                className="nav-account-popover"
                role="menu"
                aria-hidden={!menuOpen}
                data-state={menuOpen ? "open" : "closed"}
                inert={!menuOpen}
              >
                <div className="nav-account-identity">
                  <strong>{session.user.displayName}</strong>
                  <span>{session.user.email}</span>
                </div>
                <Link role="menuitem" href="/account" onClick={() => setMenuOpen(false)}>My account</Link>
                <Link
                  href="/sessions"
                  role="menuitem"
                  aria-label={sessionNotificationCount > 0 ? `Sessions and bookings, ${sessionNotificationCount} ${sessionNotificationCount === 1 ? "update" : "updates"}` : undefined}
                  onClick={() => { markSessionNotificationsRead(); setMenuOpen(false); }}
                >
                  Sessions and bookings{sessionNotificationCount > 0 ? ` (${sessionNotificationCount > 9 ? "9+" : sessionNotificationCount})` : ""}
                </Link>
                <Link href="/training-plans" role="menuitem" onClick={() => setMenuOpen(false)}>Training plans</Link>
                <Link href="/recommendations" role="menuitem" onClick={() => setMenuOpen(false)}>Recommendations</Link>
                <Link role="menuitem" href={coachHref} onClick={() => setMenuOpen(false)}>{coachLabel}</Link>
                {isAdministrator && <Link role="menuitem" href="/admin/coaches" onClick={() => setMenuOpen(false)}>Coach administration</Link>}
                <button role="menuitem" type="button" onClick={logOut} disabled={loggingOut}>{loggingOut ? "Logging out…" : "Log out"}</button>
                {menuError && <span className="nav-account-error" role="alert">{menuError}</span>}
              </div>
              </div>
            </>
          ) : (
            <>
              <Link className="nav-coach-action" href={coachHref}>{coachLabel}</Link>
              <Link className="nav-account" href="/account">Sign in</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
