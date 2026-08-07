export const coachApplicationStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type CoachApplicationStatus = typeof coachApplicationStatuses[number];

const suggestedSports = [
  "Badminton", "Basketball", "Boxing", "Cricket", "Football", "Ice Hockey",
  "Running", "Strength", "Swimming", "Table Tennis", "Tennis", "Yoga",
] as const;
const audiences = ["Children", "Teenagers", "Adults", "Seniors"] as const;
const levels = ["Beginner", "Intermediate", "Advanced"] as const;

export const coachApplicationOptions = { sports: suggestedSports, audiences, levels };

type UnknownRecord = Record<string, unknown>;

function optionalText(value: unknown, label: string, max: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const result = value.trim();
  if (result.length > max) throw new Error(`${label} is too long.`);
  return result || null;
}

function stringList(value: unknown, label: string, allowed: readonly string[], maxItems: number) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`Choose valid ${label}.`);
  const result = Array.from(new Set(value));
  if (result.some((item) => typeof item !== "string" || !allowed.includes(item))) {
    throw new Error(`Choose valid ${label}.`);
  }
  return result as string[];
}

function flexibleTermList(value: unknown, label: string, maxItems: number, maxLength: number) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`Choose valid ${label}.`);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") throw new Error(`Choose valid ${label}.`);
    const normalized = item.trim().replace(/\s+/g, " ");
    if (normalized.length < 2 || normalized.length > maxLength) throw new Error(`Choose valid ${label}.`);
    const key = normalized.toLocaleLowerCase("en");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

function tagsList(value: unknown) {
  const tags = flexibleTermList(value, "tags", 12, 40);
  const reserved = /\b(coachconnect\s+verified|verified\s+by\s+coachconnect|official\s+coachconnect)\b/i;
  if (tags.some((tag) => reserved.test(tag))) {
    throw new Error("That tag contains a reserved trust claim.");
  }
  return tags;
}

function profileImagePath(value: unknown) {
  const path = optionalText(value, "Profile image", 240);
  if (path === null) return null;
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  if (!new RegExp(`^${uuid}/${uuid}\\.(?:jpg|jpeg|png|webp)$`, "i").test(path)) {
    throw new Error("Profile image path is invalid.");
  }
  return path;
}

function adImagePaths(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 5) throw new Error("Coach ads can include up to five images.");
  const paths = value.map((item) => profileImagePath(item));
  if (paths.some((path) => path === null)) throw new Error("Coach ad image paths are invalid.");
  return Array.from(new Set(paths as string[]));
}

function optionalInteger(value: unknown, label: string, minimum: number, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  const result = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(result) || (result as number) < minimum || (result as number) > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return result as number;
}

function availabilityList(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 30) throw new Error("Availability is invalid.");
  const result = value.map((item) => {
    if (typeof item !== "string") throw new Error("Availability is invalid.");
    const text = item.trim();
    if (!text || text.length > 120) throw new Error("Availability is invalid.");
    return text;
  });
  return Array.from(new Set(result));
}

function faqList(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 12) throw new Error("FAQs are invalid.");
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("FAQs are invalid.");
    const { question, answer } = item as UnknownRecord;
    if (typeof question !== "string" || typeof answer !== "string") throw new Error("FAQs are invalid.");
    const normalizedQuestion = question.trim();
    const normalizedAnswer = answer.trim();
    if (!normalizedQuestion || normalizedQuestion.length > 200 || !normalizedAnswer || normalizedAnswer.length > 1000) {
      throw new Error("FAQs are invalid.");
    }
    return { question: normalizedQuestion, answer: normalizedAnswer };
  });
}

export function normalizeCoachApplicationDraft(body: UnknownRecord) {
  const offersOnline = body.offersOnline === true;
  const offersInPerson = body.offersInPerson === true;
  const availability = availabilityList(body.availability);
  const faqs = faqList(body.faqs);

  return {
    headline: optionalText(body.headline, "Headline", 120),
    bio: optionalText(body.bio, "Biography", 2000),
    sports: flexibleTermList(body.sports, "sports", 8, 60),
    tags: tagsList(body.tags),
    profile_image_path: profileImagePath(body.profileImagePath),
    ad_image_paths: adImagePaths(body.adImagePaths),
    experience_years: optionalInteger(body.experienceYears, "Experience", 0, 80),
    qualifications: optionalText(body.qualifications, "Qualifications", 1200),
    audiences: stringList(body.audiences, "audiences", audiences, audiences.length),
    levels: stringList(body.levels, "levels", levels, levels.length),
    lesson_plan: optionalText(body.lessonPlan, "Lesson plan", 3000),
    session_price_pkr: optionalInteger(body.sessionPricePkr, "Session price", 500, 1000000),
    offers_online: offersOnline,
    offers_in_person: offersInPerson,
    city: offersInPerson ? optionalText(body.city, "City", 80) : null,
    public_area: offersInPerson ? optionalText(body.publicArea, "Training area", 120) : null,
    availability,
    faqs,
  };
}

export function serializeCoachApplication(row: UnknownRecord | null) {
  if (!row) return null;
  return {
    userId: row.user_id,
    status: row.status,
    headline: row.headline,
    bio: row.bio,
    sports: row.sports,
    tags: row.tags,
    profileImagePath: row.profile_image_path,
    adImagePaths: row.ad_image_paths ?? [],
    experienceYears: row.experience_years,
    qualifications: row.qualifications,
    audiences: row.audiences,
    levels: row.levels,
    lessonPlan: row.lesson_plan,
    sessionPricePkr: row.session_price_pkr,
    offersOnline: row.offers_online,
    offersInPerson: row.offers_in_person,
    city: row.city,
    publicArea: row.public_area,
    publicLongitude: row.public_longitude,
    publicLatitude: row.public_latitude,
    availability: row.availability,
    faqs: row.faqs,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}
