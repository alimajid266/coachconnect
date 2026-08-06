"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import SiteLogo from "@/components/site-logo";
import { coachApplicationOptions, type CoachApplicationStatus } from "@/lib/coach-application";

type Faq = { question: string; answer: string };

type Draft = {
  headline: string;
  bio: string;
  sports: string[];
  experienceYears: string;
  qualifications: string;
  audiences: string[];
  levels: string[];
  lessonPlan: string;
  sessionPricePkr: string;
  offersOnline: boolean;
  offersInPerson: boolean;
  city: string;
  publicArea: string;
  availability: unknown[];
  faqs: Faq[];
};

type Application = Partial<Draft> & {
  userId: string;
  status: CoachApplicationStatus;
  reviewNote?: string | null;
};

const emptyDraft: Draft = {
  headline: "",
  bio: "",
  sports: [],
  experienceYears: "",
  qualifications: "",
  audiences: [],
  levels: [],
  lessonPlan: "",
  sessionPricePkr: "",
  offersOnline: false,
  offersInPerson: false,
  city: "",
  publicArea: "",
  availability: [],
  faqs: [{ question: "", answer: "" }],
};

const statusLabels: Record<CoachApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Changes requested",
  SUSPENDED: "Suspended",
};

function asDraft(application: Application | null): Draft {
  if (!application) return emptyDraft;
  return {
    headline: application.headline ?? "",
    bio: application.bio ?? "",
    sports: application.sports ?? [],
    experienceYears: application.experienceYears == null ? "" : String(application.experienceYears),
    qualifications: application.qualifications ?? "",
    audiences: application.audiences ?? [],
    levels: application.levels ?? [],
    lessonPlan: application.lessonPlan ?? "",
    sessionPricePkr: application.sessionPricePkr == null ? "" : String(application.sessionPricePkr),
    offersOnline: application.offersOnline ?? false,
    offersInPerson: application.offersInPerson ?? false,
    city: application.city ?? "",
    publicArea: application.publicArea ?? "",
    availability: application.availability ?? [],
    faqs: application.faqs?.length ? application.faqs : [{ question: "", answer: "" }],
  };
}

export default function CoachApplicationPage() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/coach-application")
      .then(async (response) => {
        const result = await response.json();
        if (!active) return;
        if (response.status === 401) {
          setNeedsSignIn(true);
          return;
        }
        if (!response.ok) throw new Error(result.error || "Coach applications are unavailable.");
        setApplication(result.application);
        setDraft(asDraft(result.application));
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Coach applications are unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const locked = application?.status === "SUBMITTED"
    || application?.status === "UNDER_REVIEW"
    || application?.status === "SUSPENDED";

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "sports" | "audiences" | "levels", value: string) {
    const values = draft[key];
    update(key, values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function updateFaq(index: number, key: keyof Faq, value: string) {
    update("faqs", draft.faqs.map((faq, faqIndex) => faqIndex === index ? { ...faq, [key]: value } : faq));
  }

  async function saveDraft() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/coach-application", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          faqs: draft.faqs.filter((faq) => faq.question.trim() || faq.answer.trim()),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The draft could not be saved.");
      setApplication(result.application);
      setDraft(asDraft(result.application));
      setMessage(application?.status === "APPROVED" ? "Coach profile updates saved." : "Draft saved.");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The draft could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await saveDraft();
  }

  async function submitForReview() {
    const saved = await saveDraft();
    if (!saved) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/coach-application", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The application could not be submitted.");
      setApplication(result.application);
      setMessage("Application submitted for administrator review.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The application could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="application-state"><p className="eyebrow">Coach onboarding</p><h1>Opening your application…</h1></main>;
  }

  if (needsSignIn) {
    return <main className="application-state"><SiteLogo /><p className="eyebrow">Member access</p><h1>Sign in to become a coach.</h1><p>Your coach application stays connected to your existing member account.</p><Link className="button button-accent" href="/account?next=%2Fcoach%2Fapply">Go to sign in</Link></main>;
  }

  return (
    <main className="application-page">
      <header className="application-header">
        <SiteLogo />
        <Link href="/account">My account</Link>
      </header>

      <section className="application-intro">
        <div><p className="eyebrow">Coach onboarding</p><h1>Build your coach profile</h1><p>Tell members what you coach, how your sessions work, and where you can train.</p></div>
        <div className="application-status"><span>Application status</span><strong>{application ? statusLabels[application.status] : "Not started"}</strong></div>
      </section>

      {application?.status === "REJECTED" && application.reviewNote && <p className="application-review-note"><strong>Requested changes:</strong> {application.reviewNote}</p>}
      {application?.status === "SUSPENDED" && application.reviewNote && <p className="application-review-note"><strong>Suspension reason:</strong> {application.reviewNote} <a href="mailto:support@coachconnect.pk?subject=Coach%20profile%20reactivation">Contact support about reactivation</a>.</p>}
      {locked && <p className="application-locked">This application cannot be edited while it is {statusLabels[application.status].toLowerCase()}.</p>}
      {error && <p className="form-status error" role="alert">{error}</p>}
      {message && <p className="form-status success" role="status">{message}</p>}

      <form className="application-form" onSubmit={handleSubmit}>
        <fieldset disabled={locked || busy}>
          <legend>Professional introduction</legend>
          <label>Professional headline<input aria-label="Professional headline" maxLength={120} value={draft.headline} onChange={(event) => update("headline", event.target.value)} placeholder="Patient tennis coaching for confident match play" /></label>
          <label>Coaching biography<textarea aria-label="Coaching biography" maxLength={2000} rows={6} value={draft.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Describe your coaching approach, experience and the progress members can expect." /></label>
        </fieldset>

        <fieldset disabled={locked || busy}>
          <legend>Sports and experience</legend>
          <div className="application-options" role="group" aria-label="Sports you coach">
            {coachApplicationOptions.sports.map((sport) => <label key={sport}><input type="checkbox" checked={draft.sports.includes(sport)} onChange={() => toggleList("sports", sport)} />{sport}</label>)}
          </div>
          <div className="application-grid two">
            <label>Years of coaching experience<input type="number" min="0" max="80" value={draft.experienceYears} onChange={(event) => update("experienceYears", event.target.value)} /></label>
            <label>Qualifications<textarea rows={3} maxLength={1200} value={draft.qualifications} onChange={(event) => update("qualifications", event.target.value)} placeholder="Certifications, playing background, safeguarding training or relevant education" /></label>
          </div>
        </fieldset>

        <fieldset disabled={locked || busy}>
          <legend>Who your sessions support</legend>
          <div className="application-grid two">
            <div className="application-options" role="group" aria-label="People you coach"><strong>People you coach</strong>{coachApplicationOptions.audiences.map((audience) => <label key={audience}><input type="checkbox" checked={draft.audiences.includes(audience)} onChange={() => toggleList("audiences", audience)} />{audience}</label>)}</div>
            <div className="application-options" role="group" aria-label="Experience levels"><strong>Experience levels</strong>{coachApplicationOptions.levels.map((level) => <label key={level}><input type="checkbox" checked={draft.levels.includes(level)} onChange={() => toggleList("levels", level)} />{level}</label>)}</div>
          </div>
          <label>Lesson plan<textarea rows={5} maxLength={3000} value={draft.lessonPlan} onChange={(event) => update("lessonPlan", event.target.value)} placeholder="Explain how a typical session begins, develops and finishes." /></label>
        </fieldset>

        <fieldset disabled={locked || busy}>
          <legend>Service and training area</legend>
          <div className="application-grid two">
            <label>Session price (PKR)<input type="number" min="500" max="1000000" step="100" value={draft.sessionPricePkr} onChange={(event) => update("sessionPricePkr", event.target.value)} /></label>
            <div className="application-options" role="group" aria-label="Training formats"><strong>Training formats</strong><label><input type="checkbox" checked={draft.offersInPerson} onChange={(event) => update("offersInPerson", event.target.checked)} />In person</label><label><input type="checkbox" checked={draft.offersOnline} onChange={(event) => update("offersOnline", event.target.checked)} />Online</label></div>
          </div>
          {draft.offersInPerson && <div className="application-location"><p><strong>Public training area only.</strong> Enter a public venue or approximate neighborhood. Never enter a home address; exact meeting details are shared after booking.</p><div className="application-grid two"><label>City<select value={draft.city} onChange={(event) => update("city", event.target.value)}><option value="">Choose a city</option><option>Lahore</option><option>Karachi</option><option>Islamabad</option><option>Rawalpindi</option></select></label><label>Public venue or approximate area<input value={draft.publicArea} onChange={(event) => update("publicArea", event.target.value)} placeholder="For example, Gulberg or Model Town Sports Club" /></label></div></div>}
          {!draft.offersInPerson && <p className="application-privacy"><strong>Location privacy:</strong> Never enter a home address. Physical location fields appear only after you select in-person coaching.</p>}
        </fieldset>

        <fieldset disabled={locked || busy}>
          <legend>Frequently asked questions</legend>
          {draft.faqs.map((faq, index) => <div className="application-grid two" key={index}><label>Question {index + 1}<input value={faq.question} maxLength={160} onChange={(event) => updateFaq(index, "question", event.target.value)} /></label><label>Answer {index + 1}<textarea rows={3} value={faq.answer} maxLength={800} onChange={(event) => updateFaq(index, "answer", event.target.value)} /></label></div>)}
          {draft.faqs.length < 5 && <button className="button button-secondary" type="button" onClick={() => update("faqs", [...draft.faqs, { question: "", answer: "" }])}>Add another question</button>}
        </fieldset>

        {!locked && <div className="application-actions"><button className="button button-secondary" type="submit" disabled={busy}>{busy ? "Saving…" : application?.status === "APPROVED" ? "Save profile updates" : "Save draft"}</button>{application?.status !== "APPROVED" && <button className="button button-accent" type="button" disabled={busy} onClick={submitForReview}>Submit for review</button>}</div>}
      </form>
    </main>
  );
}
