import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { allSports, type Coach, type Sport } from "@/lib/coaches";

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function faqs(value: unknown): Coach["faqs"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const question = typeof record.question === "string" ? record.question.trim() : "";
    const answer = typeof record.answer === "string" ? record.answer.trim() : "";
    return question && answer ? [{ question, answer }] : [];
  });
}

function publicCoach(row: Record<string, unknown>, rank: number): Coach | null {
  const id = typeof row.user_id === "string" ? row.user_id : "";
  const name = typeof row.display_name === "string" ? row.display_name.trim() : "";
  const headline = typeof row.headline === "string" ? row.headline.trim() : "";
  const bio = typeof row.bio === "string" ? row.bio.trim() : "";
  const sports = stringArray(row.sports).filter((sport): sport is Sport => allSports.includes(sport as Sport));
  const price = typeof row.session_price_pkr === "number" ? row.session_price_pkr : 0;
  const experienceYears = typeof row.experience_years === "number" ? row.experience_years : 0;
  const offersOnline = row.offers_online === true;
  const offersInPerson = row.offers_in_person === true;
  const city = typeof row.city === "string" ? row.city.trim() : "";
  const publicArea = typeof row.public_area === "string" ? row.public_area.trim() : "";
  const qualifications = typeof row.qualifications === "string" ? row.qualifications.trim() : "";
  const lessonPlan = typeof row.lesson_plan === "string" ? row.lesson_plan.trim() : "";

  if (!id || !name || !headline || !bio || sports.length === 0 || price <= 0 || (!offersOnline && !offersInPerson)) return null;

  const mode: Coach["mode"] = offersOnline && offersInPerson
    ? "In person + Online"
    : offersOnline ? "Online" : "In person";

  return {
    id,
    name,
    location: offersInPerson && city ? city : "Online",
    sports,
    specialty: headline,
    rating: null,
    reviewCount: 0,
    price,
    reason: headline,
    badge: "New coach",
    mode,
    offersOnline,
    offersInPerson,
    area: offersInPerson ? (publicArea || city || "Area to be arranged") : "Online",
    coordinates: null,
    availability: stringArray(row.availability),
    image: null,
    rank,
    bio,
    experience: `${experienceYears} ${experienceYears === 1 ? "year" : "years"} of coaching experience`,
    credentials: qualifications ? [qualifications] : [],
    coachingStyle: "",
    languages: [],
    lessonCount: 0,
    audiences: stringArray(row.audiences),
    levels: stringArray(row.levels),
    lessonPlan: lessonPlan ? [{ title: "Typical session", description: lessonPlan }] : [],
    faqs: faqs(row.faqs),
  };
}

export async function GET() {
  const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.json({ error: "Approved coaches are temporarily unavailable." }, { status: 503 });
  }

  const supabase = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc("list_public_coaches");
  if (error || !Array.isArray(data)) {
    return NextResponse.json({ error: "Approved coaches are temporarily unavailable." }, { status: 503 });
  }

  const coaches = data.flatMap((row, index) => {
    const coach = publicCoach(row as Record<string, unknown>, 1000 + index);
    return coach ? [coach] : [];
  });
  const response = NextResponse.json({ coaches });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
