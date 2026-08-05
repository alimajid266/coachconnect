export const coachApplicationStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type CoachApplicationStatus = typeof coachApplicationStatuses[number];

const sports = [
  "Badminton", "Basketball", "Boxing", "Cricket", "Football", "Ice Hockey",
  "Running", "Strength", "Swimming", "Table Tennis", "Tennis", "Yoga",
] as const;
const audiences = ["Children", "Teenagers", "Adults", "Seniors"] as const;
const levels = ["Beginner", "Intermediate", "Advanced"] as const;

export const coachApplicationOptions = { sports, audiences, levels };

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

function optionalInteger(value: unknown, label: string, minimum: number, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  const result = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(result) || (result as number) < minimum || (result as number) > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return result as number;
}

export function normalizeCoachApplicationDraft(body: UnknownRecord) {
  const offersOnline = body.offersOnline === true;
  const offersInPerson = body.offersInPerson === true;
  const availability = body.availability ?? [];
  const faqs = body.faqs ?? [];
  if (!Array.isArray(availability) || availability.length > 30) throw new Error("Availability is invalid.");
  if (!Array.isArray(faqs) || faqs.length > 12) throw new Error("FAQs are invalid.");

  return {
    headline: optionalText(body.headline, "Headline", 120),
    bio: optionalText(body.bio, "Biography", 2000),
    sports: stringList(body.sports, "sports", sports, 8),
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
    availability: row.availability,
    faqs: row.faqs,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}
