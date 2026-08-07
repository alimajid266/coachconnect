import type { SupabaseClient } from "@supabase/supabase-js";
import { illustrativeImageForSports, type Coach } from "@/lib/coaches";

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function delimitedStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return stringArray(value);
  return typeof value === "string"
    ? value.split("|").map((item) => item.trim()).filter(Boolean)
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

export function safeProfileImagePath(value: unknown) {
  if (typeof value !== "string") return null;
  const path = value.trim();
  const safePath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/i;
  return safePath.test(path) ? path : null;
}

export async function attachSignedProfileImage(
  supabase: SupabaseClient,
  coach: Coach,
  value: unknown,
): Promise<Coach> {
  const path = safeProfileImagePath(value);
  if (!path) return coach;
  const { data, error } = await supabase.storage.from("coach-profile-images").createSignedUrl(path, 3600);
  return !error && data?.signedUrl ? { ...coach, image: data.signedUrl } : coach;
}

export async function attachSignedCoachMedia(
  supabase: SupabaseClient,
  coach: Coach,
  row: Record<string, unknown>,
): Promise<Coach> {
  const adPaths = stringArray(row.ad_image_paths).map(safeProfileImagePath).filter((path): path is string => path !== null);
  const coverPath = safeProfileImagePath(row.profile_image_path);
  const paths = Array.from(new Set(coverPath ? [coverPath, ...adPaths] : adPaths)).slice(0, 5);
  const signedAds = (await Promise.all(paths.map(async (path) => {
    const { data, error } = await supabase.storage.from("coach-profile-images").createSignedUrl(path, 3600);
    return !error ? data?.signedUrl ?? null : null;
  }))).filter((url): url is string => url !== null);
  const avatarPath = safeProfileImagePath(row.avatar_path);
  let avatar: string | null = null;
  if (avatarPath) {
    const { data, error } = await supabase.storage.from("coach-profile-images").createSignedUrl(avatarPath, 3600);
    if (!error) avatar = data?.signedUrl ?? null;
  }
  return { ...coach, image: signedAds[0] ?? coach.image, adImages: signedAds, avatar };
}

export function publicCoach(row: Record<string, unknown>, rank: number): Coach | null {
  const id = typeof row.profile_id === "string"
    ? row.profile_id
    : (typeof row.user_id === "string" ? row.user_id : "");
  const name = typeof row.display_name === "string" ? row.display_name.trim() : "";
  const headline = typeof row.headline === "string" ? row.headline.trim() : "";
  const bio = typeof row.bio === "string" ? row.bio.trim() : "";
  const sports = stringArray(row.sports);
  const tags = stringArray(row.tags);
  const price = typeof row.session_price_pkr === "number" ? row.session_price_pkr : 0;
  const experienceYears = typeof row.experience_years === "number" ? row.experience_years : 0;
  const offersOnline = row.offers_online === true;
  const offersInPerson = row.offers_in_person === true;
  const city = typeof row.city === "string" ? row.city.trim() : "";
  const publicArea = typeof row.public_area === "string" ? row.public_area.trim() : "";
  const qualifications = typeof row.qualifications === "string" ? row.qualifications.trim() : "";
  const lessonPlan = delimitedStringArray(row.lesson_plan);
  const languages = delimitedStringArray(row.languages);
  const coachingStyle = typeof row.coaching_style === "string" ? row.coaching_style.trim() : "";
  const longitude = typeof row.public_longitude === "number" ? row.public_longitude : null;
  const latitude = typeof row.public_latitude === "number" ? row.public_latitude : null;
  const isDemo = row.is_demo === true;
  const ratingValue = typeof row.rating === "number" ? row.rating : Number(row.rating);
  const reviewCount = Number(row.review_count ?? 0);
  const lessonCount = Number(row.lesson_count ?? 0);
  const demoImage = isDemo ? illustrativeImageForSports(sports) : null;
  const coordinates: Coach["coordinates"] = offersInPerson
    && longitude !== null && latitude !== null
    && longitude >= 60 && longitude <= 78 && latitude >= 23 && latitude <= 38
    ? [longitude, latitude]
    : null;

  if (!id || !name || !headline || !bio || sports.length === 0 || price <= 0 || (!offersOnline && !offersInPerson)) return null;

  const mode: Coach["mode"] = offersOnline && offersInPerson
    ? "In person + Online"
    : offersOnline ? "Online" : "In person";

  return {
    id,
    name,
    location: offersInPerson && city ? city : "Online",
    sports,
    tags,
    specialty: headline,
    rating: Number.isFinite(ratingValue) && reviewCount > 0 ? ratingValue : null,
    reviewCount: Number.isFinite(reviewCount) ? reviewCount : 0,
    price,
    reason: headline,
    badge: isDemo ? "Demo profile" : reviewCount > 0 ? "Reviewed coach" : "New coach",
    isDemo,
    mode,
    offersOnline,
    offersInPerson,
    area: offersInPerson ? (publicArea || city || "Area to be arranged") : "Online",
    coordinates,
    availability: stringArray(row.availability),
    image: demoImage,
    rank,
    bio,
    experience: isDemo
      ? "Illustrative coaching background"
      : `${experienceYears} ${experienceYears === 1 ? "year" : "years"} of coaching experience`,
    credentials: qualifications ? [qualifications] : [],
    coachingStyle,
    languages,
    lessonCount: Number.isFinite(lessonCount) ? lessonCount : 0,
    audiences: stringArray(row.audiences),
    levels: stringArray(row.levels),
    lessonPlan: lessonPlan.map((description, index) => ({ title: `Step ${index + 1}`, description })),
    faqs: faqs(row.faqs),
  };
}
