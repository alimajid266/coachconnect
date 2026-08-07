"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import SiteLogo from "@/components/site-logo";
import { coachApplicationOptions, type CoachApplicationStatus } from "@/lib/coach-application";

type Faq = { question: string; answer: string };

type Draft = {
  headline: string;
  bio: string;
  sports: string[];
  tags: string[];
  profileImagePath: string;
  adImagePaths: string[];
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
  tags: [],
  profileImagePath: "",
  adImagePaths: [],
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
    tags: application.tags ?? [],
    profileImagePath: application.profileImagePath ?? "",
    adImagePaths: application.adImagePaths ?? (application.profileImagePath ? [application.profileImagePath] : []),
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

function submissionIssues(draft: Draft) {
  const issues: string[] = [];
  if (draft.headline.trim().length < 10) issues.push("Professional headline: use at least 10 characters.");
  if (draft.bio.trim().length < 80) issues.push("Coaching biography: use at least 80 characters.");
  if (draft.sports.length === 0) issues.push("Sports: choose at least one sport.");

  const experience = Number(draft.experienceYears);
  if (draft.experienceYears === "" || !Number.isInteger(experience) || experience < 0 || experience > 80) {
    issues.push("Years of coaching experience: enter a whole number from 0 to 80.");
  }

  if (draft.qualifications.trim().length < 10) issues.push("Qualifications: use at least 10 characters.");
  if (draft.audiences.length === 0) issues.push("People you coach: choose at least one group.");
  if (draft.levels.length === 0) issues.push("Experience levels: choose at least one level.");
  if (draft.lessonPlan.trim().length < 40) issues.push("Lesson plan: use at least 40 characters.");

  const price = Number(draft.sessionPricePkr);
  if (draft.sessionPricePkr === "" || !Number.isInteger(price) || price < 500 || price > 1_000_000) {
    issues.push("Session price: enter a whole PKR amount from 500 to 1,000,000.");
  }

  if (!draft.offersOnline && !draft.offersInPerson) issues.push("Training formats: choose online or in person.");
  if (draft.offersInPerson && !draft.city.trim()) issues.push("City: choose where you coach in person.");
  if (draft.offersInPerson && !draft.publicArea.trim()) issues.push("Public training area: enter an approximate area or public venue.");
  return issues;
}

export default function CoachApplicationPage() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customSport, setCustomSport] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

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

  function addCustomSport() {
    const value = customSport.trim().replace(/\s+/g, " ");
    if (!value || draft.sports.length >= 8) return;
    if (!draft.sports.some((sport) => sport.toLocaleLowerCase("en") === value.toLocaleLowerCase("en"))) {
      update("sports", [...draft.sports, value]);
    }
    setCustomSport("");
  }

  function addCustomTag() {
    const value = customTag.trim().replace(/\s+/g, " ");
    if (!value || draft.tags.length >= 12) return;
    if (!draft.tags.some((tag) => tag.toLocaleLowerCase("en") === value.toLocaleLowerCase("en"))) {
      update("tags", [...draft.tags, value]);
    }
    setCustomTag("");
  }

  async function uploadAdImages(files: File[]) {
    const remaining = 5 - draft.adImagePaths.length;
    if (files.length === 0) return;
    if (remaining <= 0 || files.length > remaining) {
      setError("A coach ad can include up to five images. Remove one before adding another.");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const paths: string[] = [];
      const previews: string[] = [];
      for (const file of files) {
        const response = await fetch("/api/coach-application/image?purpose=coach-ad", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "A coach ad image could not be uploaded.");
        paths.push(result.path);
        if (typeof URL.createObjectURL === "function") previews.push(URL.createObjectURL(file));
      }
      setDraft((current) => ({
        ...current,
        profileImagePath: current.profileImagePath || paths[0],
        adImagePaths: [...current.adImagePaths, ...paths],
      }));
      setImagePreviews((current) => [...current, ...previews]);
      setMessage(`${paths.length} coach ad image${paths.length === 1 ? "" : "s"} uploaded. Save your profile to publish them.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The coach ad images could not be uploaded.");
    } finally {
      setBusy(false);
    }
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
      setMessage(result.application?.status === "APPROVED" ? "Coach profile updates are live." : "Draft saved.");
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
    const issues = submissionIssues(draft);
    if (issues.length > 0) {
      setMessage("");
      setError(`Please fix these fields before submitting: ${issues.join(" ")}`);
      return;
    }

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
      setMessage("Application submitted for CoachConnect team review.");
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
        <div><p className="eyebrow">Coach onboarding</p><h1>Build your coach profile</h1><p>Tell members what you coach, how your sessions work, and where you can train.</p>{application?.status === "APPROVED" && <Link className="button button-accent" href="/account#schedule-heading">Manage availability and bookings</Link>}</div>
        <div className="application-status"><span>Application status</span><strong>{application ? statusLabels[application.status] : "Not started"}</strong></div>
      </section>

      {application?.status === "REJECTED" && application.reviewNote && <p className="application-review-note"><strong>Requested changes:</strong> {application.reviewNote}</p>}
      {application?.status === "SUSPENDED" && application.reviewNote && <p className="application-review-note"><strong>Suspension reason:</strong> {application.reviewNote} <a href="mailto:support@coachconnect.pk?subject=Coach%20profile%20reactivation">Contact support about reactivation</a>.</p>}
      {locked && <p className="application-locked">{application.status === "SUSPENDED"
        ? "This application cannot be edited while it is suspended."
        : "Editing is paused while the team reviews this profile."}</p>}
      {error && <p className="form-status error" role="alert">{error}</p>}
      {message && <p className="form-status success" role="status">{message}</p>}

      <form className="application-form" onSubmit={handleSubmit}>
        <fieldset disabled={locked || busy}>
          <legend>Professional introduction</legend>
          <label>Professional headline<input aria-label="Professional headline" minLength={10} maxLength={120} value={draft.headline} onChange={(event) => update("headline", event.target.value)} placeholder="Patient tennis coaching for confident match play" /><span className="application-field-hint">At least 10 characters</span></label>
          <label>Coaching biography<textarea aria-label="Coaching biography" minLength={80} maxLength={2000} rows={6} value={draft.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Describe your coaching approach, experience and the progress members can expect." /><span className="application-field-hint">At least 80 characters</span></label>
        </fieldset>

        <fieldset disabled={locked || busy}>
          <legend>Coach ad images</legend>
          <div className="application-image-upload">
            {imagePreviews.length > 0 && <div className="application-image-gallery" aria-label="New coach ad image previews">{imagePreviews.map((preview, index) => <Image key={preview} className="application-image-preview" src={preview} width={160} height={160} unoptimized alt={`New coach ad preview ${index + 1}`} />)}</div>}
            <label>Coach ad images<input aria-label="Coach ad images" multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAdImages(Array.from(event.target.files ?? []))} /><span className="application-field-hint">Add up to five images for your public coach ad. JPEG, PNG or WebP, up to 5 MB each. Your first image is the cover.</span></label>
            {draft.adImagePaths.length > 0 && imagePreviews.length === 0 && <p className="application-field-hint">{draft.adImagePaths.length} coach ad image{draft.adImagePaths.length === 1 ? " is" : "s are"} saved.</p>}
          </div>
        </fieldset>

        <fieldset disabled={locked || busy}>
          <legend>Sports and experience</legend>
          <div className="application-options" role="group" aria-label="Sports you coach">
            {coachApplicationOptions.sports.map((sport) => <label key={sport}><input type="checkbox" checked={draft.sports.includes(sport)} onChange={() => toggleList("sports", sport)} />{sport}</label>)}
          </div>
          <div className="application-term-editor">
            <label>Add another sport<input aria-label="Add another sport" maxLength={60} value={customSport} onChange={(event) => setCustomSport(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomSport(); } }} placeholder="For example, squash or archery" /></label>
            <button className="button button-secondary" type="button" onClick={addCustomSport} disabled={!customSport.trim() || draft.sports.length >= 8}>Add sport</button>
          </div>
          {draft.sports.filter((sport) => !coachApplicationOptions.sports.includes(sport as never)).length > 0 && <div className="application-tags" aria-label="Custom sports">{draft.sports.filter((sport) => !coachApplicationOptions.sports.includes(sport as never)).map((sport) => <button type="button" key={sport} onClick={() => update("sports", draft.sports.filter((item) => item !== sport))}>{sport} ×</button>)}</div>}
          <div className="application-term-editor">
            <label>Profile tags<input aria-label="Profile tags" maxLength={40} value={customTag} onChange={(event) => setCustomTag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomTag(); } }} placeholder="For example, beginners or match preparation" /></label>
            <button className="button button-secondary" type="button" onClick={addCustomTag} disabled={!customTag.trim() || draft.tags.length >= 12}>Add tag</button>
          </div>
          <span className="application-field-hint">Add up to 12 specialties, goals or coaching-style tags.</span>
          {draft.tags.length > 0 && <div className="application-tags" aria-label="Profile tags selected">{draft.tags.map((tag) => <button type="button" key={tag} aria-label={`Remove ${tag} tag`} onClick={() => update("tags", draft.tags.filter((item) => item !== tag))}>{tag} ×</button>)}</div>}
          <div className="application-grid application-experience-grid">
            <label className="application-number-field">Years of coaching experience<input className="application-number-input" inputMode="numeric" type="number" min="0" max="80" value={draft.experienceYears} onChange={(event) => update("experienceYears", event.target.value)} /><span className="application-field-hint">Whole number from 0 to 80</span></label>
            <label>Qualifications<textarea aria-label="Qualifications" rows={3} minLength={10} maxLength={1200} value={draft.qualifications} onChange={(event) => update("qualifications", event.target.value)} placeholder="Certifications, playing background, safeguarding training or relevant education" /><span className="application-field-hint">At least 10 characters</span></label>
          </div>
        </fieldset>

        <fieldset disabled={locked || busy}>
          <legend>Who your sessions support</legend>
          <div className="application-grid two">
            <div className="application-options" role="group" aria-label="People you coach"><strong>People you coach</strong>{coachApplicationOptions.audiences.map((audience) => <label key={audience}><input type="checkbox" checked={draft.audiences.includes(audience)} onChange={() => toggleList("audiences", audience)} />{audience}</label>)}</div>
            <div className="application-options" role="group" aria-label="Experience levels"><strong>Experience levels</strong>{coachApplicationOptions.levels.map((level) => <label key={level}><input type="checkbox" checked={draft.levels.includes(level)} onChange={() => toggleList("levels", level)} />{level}</label>)}</div>
          </div>
          <label>Lesson plan<textarea aria-label="Lesson plan" rows={5} minLength={40} maxLength={3000} value={draft.lessonPlan} onChange={(event) => update("lessonPlan", event.target.value)} placeholder="Explain how a typical session begins, develops and finishes." /><span className="application-field-hint">At least 40 characters</span></label>
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
          {draft.faqs.map((faq, index) => <div className="application-faq-fields" key={index}><label>Question {index + 1}<input value={faq.question} maxLength={160} onChange={(event) => updateFaq(index, "question", event.target.value)} placeholder="For example, what should I bring?" /></label><label>Answer {index + 1}<textarea rows={3} value={faq.answer} maxLength={800} onChange={(event) => updateFaq(index, "answer", event.target.value)} placeholder="Give members a clear, helpful answer." /></label></div>)}
          {draft.faqs.length < 5 && <button className="button button-secondary" type="button" onClick={() => update("faqs", [...draft.faqs, { question: "", answer: "" }])}>Add another question</button>}
        </fieldset>

        {!locked && <div className="application-actions"><button className="button button-secondary" type="submit" disabled={busy}>{busy ? "Saving…" : application?.status === "APPROVED" ? "Save profile updates" : "Save draft"}</button>{application?.status !== "APPROVED" && <button className="button button-accent" type="button" disabled={busy} onClick={submitForReview}>Submit for review</button>}</div>}
      </form>
    </main>
  );
}
