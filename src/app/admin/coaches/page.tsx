"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteLogo from "@/components/site-logo";
import type { CoachApplicationStatus } from "@/lib/coach-application";

type Application = {
  userId: string;
  applicantName: string;
  status: CoachApplicationStatus;
  headline?: string;
  bio?: string;
  sports?: string[];
  experienceYears?: number;
  qualifications?: string;
  audiences?: string[];
  levels?: string[];
  lessonPlan?: string;
  sessionPricePkr?: number;
  offersOnline?: boolean;
  offersInPerson?: boolean;
  city?: string;
  publicArea?: string;
  submittedAt?: string;
};

const reviewableStatuses = new Set<CoachApplicationStatus>(["SUBMITTED", "UNDER_REVIEW"]);

export default function AdminCoachApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/coach-applications")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Applications are unavailable.");
        if (active) setApplications(result.applications);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Applications are unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function review(application: Application, decision: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED") {
    setError("");
    setMessage("");
    setBusyId(application.userId);
    try {
      const response = await fetch("/api/admin/coach-applications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: application.userId, decision, note: notes[application.userId] || "" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The review decision could not be saved.");
      setApplications((current) => current.map((item) => item.userId === application.userId ? { ...item, ...result.application } : item));
      setMessage(`${application.applicantName}'s application is now ${String(result.application.status).toLowerCase().replace("_", " ")}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The review decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-review-page">
      <header className="application-header">
        <SiteLogo />
        <Link href="/account">My account</Link>
      </header>

      <section className="admin-review-intro">
        <p className="eyebrow">Administrator workspace</p>
        <h1>Review coach applications</h1>
        <p>Check experience, services, suitability and public location details before granting coach capability.</p>
      </section>

      {error && <p className="form-status error" role="alert">{error}</p>}
      {message && <p className="form-status success" role="status">{message}</p>}
      {loading && <p>Loading coach applications…</p>}
      {!loading && !error && applications.length === 0 && <section className="admin-empty"><h2>No applications to review</h2><p>New submissions will appear here.</p></section>}

      <section className="admin-application-list" aria-label="Coach applications">
        {applications.map((application) => {
          const reviewable = reviewableStatuses.has(application.status);
          return (
            <article className="admin-application-card" key={application.userId}>
              <header><div><span className={`application-badge status-${application.status.toLowerCase()}`}>{application.status.replace("_", " ")}</span><h2>{application.applicantName}</h2><p className="admin-headline">{application.headline}</p></div>{application.submittedAt && <time dateTime={application.submittedAt}>Submitted {new Date(application.submittedAt).toLocaleDateString("en-GB")}</time>}</header>

              <div className="admin-profile-grid">
                <section><h3>Coach biography</h3><p>{application.bio}</p></section>
                <section><h3>Sports and experience</h3><p><strong>{application.sports?.join(", ")}</strong></p><p>{application.experienceYears} years coaching</p><p>{application.qualifications}</p></section>
                <section><h3>Suitable for</h3><p>{application.audiences?.join(", ")}</p><p>{application.levels?.join(", ")}</p></section>
                <section><h3>Session format</h3><p>PKR {application.sessionPricePkr?.toLocaleString()} per session</p><p>{[application.offersInPerson && "In person", application.offersOnline && "Online"].filter(Boolean).join(" + ")}</p>{application.offersInPerson && <p>{application.publicArea}, {application.city}</p>}</section>
                <section className="admin-lesson-plan"><h3>Lesson plan</h3><p>{application.lessonPlan}</p></section>
              </div>

              {reviewable && <div className="admin-review-controls">
                <label>Review note<textarea rows={3} value={notes[application.userId] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [application.userId]: event.target.value }))} placeholder="Required when requesting changes" /></label>
                <div>
                  {application.status === "SUBMITTED" && <button className="button button-secondary" disabled={busyId === application.userId} onClick={() => review(application, "UNDER_REVIEW")}>Mark under review</button>}
                  <button className="button button-secondary" disabled={busyId === application.userId} onClick={() => review(application, "REJECTED")}>Request changes</button>
                  <button className="button button-accent" disabled={busyId === application.userId} onClick={() => review(application, "APPROVED")}>Approve profile</button>
                </div>
              </div>}
              {application.status === "APPROVED" && <div className="admin-review-controls"><label>Suspension reason<textarea rows={3} value={notes[application.userId] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [application.userId]: event.target.value }))} /></label><button className="button button-secondary" disabled={busyId === application.userId} onClick={() => review(application, "SUSPENDED")}>Suspend coach profile</button></div>}
            </article>
          );
        })}
      </section>
    </main>
  );
}
