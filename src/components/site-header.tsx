"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteLogo from "@/components/site-logo";

export type SessionUser = {
  id: string | number;
  displayName: string;
  email: string;
  role: "ATHLETE" | "COACH" | "ADMIN";
  capabilities?: {
    administrator: boolean;
    coachStatus: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | null;
  };
};

type SessionState =
  | { status: "loading"; user: null }
  | { status: "ready"; user: SessionUser | null }
  | { status: "unavailable"; user: null };

type SiteHeaderProps = {
  initialSession?: { user: SessionUser | null };
  onSessionResolved?: (user: SessionUser | null, status: "ready" | "unavailable") => void;
};

export default function SiteHeader({ initialSession, onSessionResolved }: SiteHeaderProps = {}) {
  const [session, setSession] = useState<SessionState>(
    initialSession
      ? { status: "ready", user: initialSession.user }
      : { status: "loading", user: null },
  );

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

  const coachStatus = session.user?.capabilities?.coachStatus
    ?? (session.user?.role === "COACH" ? "APPROVED" : null);
  const coachHref = session.user ? "/coach/apply" : "/account?next=%2Fcoach%2Fapply";
  const coachLabel = coachStatus === "APPROVED" ? "Coach profile" : "Become a coach";

  return (
    <header className="site-header">
      <nav className="container global-nav" aria-label="Main navigation">
        <SiteLogo />
        <div className="global-nav-links">
          <Link href="/coaches">Find a coach</Link>
          {session.status === "loading" ? (
            <span className="nav-session-state" aria-live="polite">Checking account…</span>
          ) : session.status === "unavailable" ? (
            <Link className="nav-account" href="/account">My account</Link>
          ) : (
            <>
              <Link className="nav-coach-action" href={coachHref}>{coachLabel}</Link>
              <Link className="nav-account" href="/account">
                {session.user ? "My account" : "Sign in"}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
