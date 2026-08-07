"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteHeader, { type SessionUser } from "@/components/site-header";
import SportsLoader from "@/components/sports-loader";
import ScheduleManager from "@/components/schedule-manager";
import TrainingPlanBuilder from "@/components/training-plan-builder";
import RecommendationPreferences from "@/components/recommendation-preferences";

type Section = "sessions" | "training-plans" | "recommendations";

const details = {
  sessions: {
    title: "Sessions and bookings",
    eyebrow: "Your training calendar",
    description: "Manage booking requests, confirmed sessions, history, payment status and coach availability.",
  },
  "training-plans": {
    title: "Training plans",
    eyebrow: "AI-assisted planning",
    description: "Build a personal training plan before or between coached sessions.",
  },
  recommendations: {
    title: "Recommendation preferences",
    eyebrow: "Better coach matches",
    description: "Save your sports, goals, level, location and budget for more useful coach recommendations.",
  },
} as const;

export default function MemberWorkspace({ section }: { section: Section }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "anonymous" | "error">("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session unavailable");
        return response.json();
      })
      .then((body) => {
        if (!active) return;
        if (body.user) {
          setUser(body.user);
          setState("ready");
        } else {
          setState("anonymous");
        }
      })
      .catch(() => active && setState("error"));
    return () => { active = false; };
  }, []);

  if (state === "loading") return <SportsLoader message="Opening your workspace" />;
  if (state !== "ready" || !user) {
    return (
      <div className="member-account-page">
        <SiteHeader />
        <main className="account-state">
          <h1>{state === "error" ? "Unable to confirm your session" : "Sign in to continue"}</h1>
          <p>Your private training information is available only after you sign in.</p>
          <Link className="button button-primary" href={`/account?next=/${section}`}>{state === "error" ? "Retry account check" : "Sign in"}</Link>
        </main>
      </div>
    );
  }

  const copy = details[section];
  return (
    <div className="member-account-page">
      <SiteHeader initialSession={{ user }} />
      <main className="member-account-main workspace-main">
        <nav className="workspace-nav" aria-label="Member workspace">
          <Link href="/account">My account</Link>
          <Link href="/sessions" aria-current={section === "sessions" ? "page" : undefined}>Sessions</Link>
          <Link href="/training-plans" aria-current={section === "training-plans" ? "page" : undefined}>Training plans</Link>
          <Link href="/recommendations" aria-current={section === "recommendations" ? "page" : undefined}>Recommendations</Link>
        </nav>
        <section className="member-account-intro workspace-intro">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </section>
        {section === "sessions" && (
          <ScheduleManager
            userId={String(user.id)}
            approvedCoach={user.capabilities?.coachStatus === "APPROVED"}
            formats={user.capabilities?.coachFormats ?? undefined}
          />
        )}
        {section === "training-plans" && <TrainingPlanBuilder />}
        {section === "recommendations" && <RecommendationPreferences />}
      </main>
    </div>
  );
}
