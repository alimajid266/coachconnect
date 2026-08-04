"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  id: number;
  displayName: string;
  email: string;
  role: "ATHLETE" | "COACH" | "ADMIN";
};

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
        <p className="eyebrow">{signedOut ? "Signed out safely" : "Private area"}</p>
        <h1>{signedOut ? "You are signed out." : "Sign in to open your dashboard."}</h1>
        <p>{signedOut ? "Your local session has been revoked." : "Your role determines which private tools are available here."}</p>
        <Link className="button button-accent" href="/account">{signedOut ? "Sign in again" : "Go to sign in"}</Link>
      </main>
    );
  }

  const roleLabel = user.role === "ATHLETE" ? "Athlete" : user.role === "COACH" ? "Coach" : "Administrator";

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="brand dashboard-brand" href="/">Coach<span>Connect</span></Link>
        <button className="dashboard-signout" type="button" onClick={signOut}>Sign out</button>
      </header>

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow light">{roleLabel} dashboard</p>
          <h1 aria-label={`Good to see you, ${user.displayName}`}>
            Good to see you,<br /><span aria-hidden="true">{user.displayName}</span>
          </h1>
          <p>Your email stays inside your private account and never appears on a public coach profile.</p>
        </div>
        <div className="role-token"><span>Role</span><strong>{roleLabel}</strong></div>
      </section>

      <section className="dashboard-actions" aria-label={`${roleLabel} actions`}>
        {user.role === "ATHLETE" && (
          <article><span>01</span><h2>Find your next coach</h2><p>Explore sample coaching options while discovery features are developed.</p><Link className="button button-primary" href="/#coaches">Find a coach</Link></article>
        )}
        {user.role === "COACH" && (
          <article><span>01</span><h2>Build your coach profile</h2><p>Add privacy-safe service details and submit them for administrator approval.</p><Link className="button button-primary" href="/coach/profile">Build my coach profile</Link></article>
        )}
        {user.role === "ADMIN" && (
          <article><span>01</span><h2>Review coach applications</h2><p>Approve complete profiles before they can become public.</p><Link className="button button-primary" href="/admin/coaches">Approve coach profiles</Link></article>
        )}
        <article className="dashboard-muted"><span>Next</span><h2>Bookings</h2><p>Availability and booking controls arrive in Phase 4. No payment information is collected.</p><button className="button" type="button" disabled>Phase 4</button></article>
      </section>
    </main>
  );
}
