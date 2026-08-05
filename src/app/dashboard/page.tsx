"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  id: string | number;
  displayName: string;
  email: string;
  role: "ATHLETE" | "COACH" | "ADMIN";
  capabilities?: {
    administrator: boolean;
    coachStatus: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | null;
  };
};

const coachStatusCopy = {
  DRAFT: { heading: "Continue your coach application", status: "Application draft saved", action: "Continue application" },
  SUBMITTED: { heading: "Coach application submitted", status: "Application submitted", action: "View application" },
  UNDER_REVIEW: { heading: "Coach application under review", status: "Application under review", action: "View application" },
  APPROVED: { heading: "Manage your coach profile", status: "Application approved", action: "Manage coach profile" },
  REJECTED: { heading: "Update your coach application", status: "Application needs changes", action: "Update application" },
  SUSPENDED: { heading: "Coach profile status", status: "Coach profile suspended", action: "View profile status" },
} as const;

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>();
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((result: { user: User | null }) => {
        if (active) setUser(result.user);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => { active = false; };
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSignedOut(true);
    setUser(null);
  }

  if (user === undefined) {
    return <main className="dashboard-state"><p className="eyebrow">Secure dashboard</p><h1>Opening your dashboard…</h1></main>;
  }

  if (!user) {
    return (
      <main className="dashboard-state">
        <Link className="brand dashboard-brand" href="/">Coach<span>Connect</span></Link>
        <p className="eyebrow">{signedOut ? "Signed out" : "Member access"}</p>
        <h1>{signedOut ? "You are signed out." : "Sign in to open your dashboard."}</h1>
        <p>{signedOut ? "You can sign in again whenever you are ready." : "Your account determines which dashboard tools are available here."}</p>
        <Link className="button button-accent" href="/account">{signedOut ? "Sign in again" : "Go to sign in"}</Link>
      </main>
    );
  }

  const isAdministrator = user.capabilities?.administrator ?? user.role === "ADMIN";
  const coachStatus = user.capabilities?.coachStatus ?? (user.role === "COACH" ? "APPROVED" : null);
  const coachAction = coachStatus ? coachStatusCopy[coachStatus] : null;
  const accountLabel = isAdministrator ? "Administrator" : "Member";
  const capabilityLabel = coachStatus === "APPROVED"
    ? "Find coaching + coach tools"
    : isAdministrator
      ? "Find coaching + administration"
      : coachStatus
        ? "Find coaching + coach application"
      : "Find coaching";

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="brand dashboard-brand" href="/">Coach<span>Connect</span></Link>
        <button className="dashboard-signout" type="button" onClick={signOut}>Sign out</button>
      </header>

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow light">{accountLabel} dashboard</p>
          <h1 aria-label={`Good to see you, ${user.displayName}`}>
            Good to see you,<br /><span aria-hidden="true">{user.displayName}</span>
          </h1>
          <p>Manage your coaching activity and profile from one place.</p>
        </div>
        <div className="role-token"><span>Capabilities</span><strong>{capabilityLabel}</strong></div>
      </section>

      <section className="dashboard-actions" aria-label={`${accountLabel} actions`}>
        <article><span>01</span><h2>Find your next coach</h2><p>Explore coach profiles and compare specialties, locations and prices.</p><Link className="button button-primary" href="/coaches">Find a coach</Link></article>
        {!isAdministrator && (
          <article>
            <span>02</span>
            <h2>{coachAction?.heading ?? "Become a coach"}</h2>
            <p className="dashboard-application-status">{coachAction?.status ?? "Application not started"}</p>
            <p>{coachStatus === "APPROVED" ? "Update your sports, experience, services and public training area." : "Create a professional coaching profile from this account and submit it for review."}</p>
            <Link className="button button-primary" href="/coach/apply">{coachAction?.action ?? "Become a coach"}</Link>
          </article>
        )}
        {isAdministrator && (
          <article><span>02</span><h2>Review coach applications</h2><p>Approve complete profiles before they can become public.</p><Link className="button button-primary" href="/admin/coaches">Review applications</Link></article>
        )}

      </section>
    </main>
  );
}
