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

export default function SiteHeader({ initialSession, onSessionResolved, hideCoachDiscoveryLink = false }: SiteHeaderProps = {}) {
  const [session, setSession] = useState<SessionState>(
    initialSession
      ? { status: "ready", user: initialSession.user }
      : { status: "loading", user: null },
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuError, setMenuError] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);

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
      setSession({ status: "ready", user: null });
      setMenuOpen(false);
      onSessionResolved?.(null, "ready");
    } catch {
      setMenuError("Unable to log out. Try again.");
    } finally {
      setLoggingOut(false);
    }
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
                <Link href="/sessions">Sessions</Link>
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
                <Link href="/sessions" role="menuitem" onClick={() => setMenuOpen(false)}>Sessions and bookings</Link>
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
