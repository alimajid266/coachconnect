import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import CoachLocationPreview from "@/app/coaches/coach-location-preview";
import CoachBookingPanel from "@/components/coach-booking-panel";
import SiteHeader from "@/components/site-header";
import { attachSignedCoachMedia, publicCoach } from "@/lib/public-coaches";
import { coaches, formatCoachPrice, type Coach } from "@/lib/coaches";

type ProfileProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

function safeReturnTo(value: string | string[] | undefined) {
  return typeof value === "string" && value.length <= 500 && /^\/coaches(?:[/?#]|$)/.test(value)
    ? value
    : "/coaches";
}

async function loadCoach(id: string): Promise<Coach | null> {
  const fallbackDemo = coaches.find((coach) => coach.id === id) ?? null;
  if (!/^(?:[a-z0-9]+(?:-[a-z0-9]+)*|[0-9a-f]{8}-[0-9a-f-]{27})$/i.test(id) || id.length > 80) return null;
  const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return fallbackDemo;

  const supabase = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: `coach-profile-${randomUUID()}` },
  });
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const { data, error } = isUuid
    ? await supabase.rpc("get_public_coach", { target_user_id: id })
    : await supabase.rpc("get_public_demo_coach", { target_profile_id: id });
  if (error) return fallbackDemo;
  if (!Array.isArray(data) || data.length !== 1) return null;
  const baseRecord = isUuid
    ? data[0] as Record<string, unknown>
    : { ...(data[0] as Record<string, unknown>), is_demo: true };
  const statsResult = isUuid ? await supabase.rpc("get_public_coach_stats", { target_user_id: id }) : null;
  const stats = statsResult && !statsResult.error && Array.isArray(statsResult.data) && statsResult.data[0]
    ? statsResult.data[0] as Record<string, unknown>
    : {};
  const record = { ...baseRecord, ...stats };
  const coach = publicCoach(record, 1000);
  if (!coach) return fallbackDemo;
  return isUuid
    ? attachSignedCoachMedia(supabase, coach, record)
    : coach;
}

export async function generateMetadata({ params }: Pick<ProfileProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const coach = await loadCoach(id);
  if (!coach) return { title: "Coach not found | CoachConnect" };
  return {
    title: `${coach.name} | CoachConnect`,
    description: `${coach.specialty}. ${coach.sports.join(", ")} coaching in ${coach.location}.`,
  };
}

export default async function CoachProfilePage({ params, searchParams }: ProfileProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const coach = await loadCoach(id);
  if (!coach) notFound();
  const firstName = coach.name.split(" ")[0];
  const returnTo = safeReturnTo(query.returnTo);

  return (
    <div className="coach-profile-page">
      <SiteHeader />
      <main className="coach-profile-main">
        <Link className="coach-profile-back" href={returnTo}>← Back to coach results</Link>
        <article className="coach-profile-shell">
          <header className="coach-profile-hero">
            <div className="coach-profile-portrait">
              {coach.image
                ? <Image src={coach.image} alt={coach.isDemo ? `Illustrative ${coach.sports.join(" and ")} training image for Demo profile` : `${coach.name}, ${coach.sports.join(" and ")} coach`} fill sizes="(max-width: 720px) 100vw, 360px" priority unoptimized={coach.image.startsWith("http")} />
                : <div className="catalog-coach-placeholder" aria-hidden="true">{coach.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>}
            </div>
            <div className="coach-profile-heading">
              {coach.avatar && <Image className="coach-profile-avatar" src={coach.avatar} width={72} height={72} alt={`${coach.name} profile picture`} unoptimized={coach.avatar.startsWith("http")} />}
              {coach.isDemo && <span className="catalog-demo-label">Demo profile</span>}
              <p>{coach.area !== "Online" && coach.area !== coach.location ? `${coach.area}, ` : ""}{coach.location} · {coach.mode}</p>
              <h1>{coach.name}</h1>
              <strong>{coach.specialty}</strong>
              <div className="catalog-profile-sports" aria-label="Sports coached">{coach.sports.map((sport) => <span key={sport}>{sport}</span>)}</div>
              {coach.tags.length > 0 && <div className="catalog-profile-sports coach-profile-tags" aria-label="Coach tags">{coach.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
              <div className="catalog-profile-summary">
                {coach.isDemo
                  ? <span><b>Demo</b>Reviews do not apply to demo profiles</span>
                  : coach.rating === null
                    ? <span><b>New coach</b>No verified reviews yet</span>
                    : <span><b>★ {coach.rating}</b>{coach.reviewCount} verified reviews</span>}
                {coach.lessonCount > 0 && <span aria-label={`${coach.lessonCount} lessons taught`}><b>{coach.lessonCount}</b>lessons taught</span>}
                <span><b>{formatCoachPrice(coach.price)}</b>60-minute session</span>
              </div>
            </div>
          </header>

          <div className="coach-profile-content">
            <CoachBookingPanel coachId={coach.id} coachName={coach.name} isDemo={coach.isDemo === true} pricePkr={coach.price} />
            <section><h2>About {firstName}</h2><p>{coach.bio}</p></section>
            {(coach.adImages?.length ?? 0) > 1 && <section className="coach-profile-ad-gallery"><h2>Coach ad gallery</h2><div>{coach.adImages?.map((image, index) => <Image key={image} src={image} width={260} height={180} alt={`${coach.name} coaching ad image ${index + 1}`} unoptimized={image.startsWith("http")} />)}</div></section>}
            <div className="catalog-profile-fit-grid">
              <section className="catalog-profile-fit"><h2>Who {firstName} teaches</h2><div>{coach.audiences.map((audience) => <span key={audience}>{audience}</span>)}</div></section>
              <section className="catalog-profile-fit"><h2>Levels supported</h2><div>{coach.levels.map((level) => <span key={level}>{level}</span>)}</div></section>
            </div>
            <div className="catalog-profile-details">
              <section><h2>{coach.isDemo ? "Illustrative experience" : "Experience and credentials"}</h2><strong>{coach.experience}</strong><ul>{coach.credentials.map((credential) => <li key={credential}>{credential}</li>)}</ul></section>
              {(coach.coachingStyle || coach.languages.length > 0) && <section><h2>Coaching style</h2>{coach.coachingStyle && <p>{coach.coachingStyle}</p>}{coach.languages.length > 0 && <span><b>Languages</b>{coach.languages.join(" · ")}</span>}</section>}
            </div>
            {coach.lessonPlan.length > 0 && <section className="catalog-profile-plan"><h2>Lesson plan</h2><ol>{coach.lessonPlan.map((step) => <li key={step.title}><strong>{step.title}</strong><p>{step.description}</p></li>)}</ol></section>}
            {coach.availability.length > 0 && <section className="catalog-profile-availability"><h2>{coach.isDemo ? "Example availability" : "Weekly availability"}</h2><div>{coach.availability.map((day) => <span key={day}>{day}</span>)}</div></section>}
            <CoachLocationPreview coach={coach} />
            {coach.faqs.length > 0 && <section className="catalog-profile-faq"><h2>Frequently asked questions</h2><div>{coach.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>}
          </div>
        </article>
      </main>
    </div>
  );
}
