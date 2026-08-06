import type { Coach } from "@/lib/coaches";

export type DiscoveryConfidence = "high" | "medium";
export type DiscoveryCorrection = {
  source: string;
  target: string;
  confidence: DiscoveryConfidence;
};
export type DiscoveryFilters = {
  sport?: string;
  city?: string;
  level?: string;
  format?: "Online" | "In person";
  affordability?: boolean;
  maxPrice?: number;
  day?: string;
  tags: string[];
};
export type CoachQueryInterpretation = {
  original: string;
  filters: DiscoveryFilters;
  corrections: DiscoveryCorrection[];
  conflicts: string[];
  keywords: string[];
};
export type Recommendation = {
  coach: Coach;
  score: number;
  eligible: boolean;
  label: "Strong match" | "Good match" | "Possible match" | null;
  reasons: string[];
};

type ConceptMap = Record<string, readonly string[]>;

const sportAliases: ConceptMap = {
  Badminton: ["badminton", "badmiton"],
  Basketball: ["basketball", "hoops"],
  Boxing: ["boxing", "boxer"],
  Cricket: ["cricket", "criket"],
  Football: ["football", "soccer", "footy"],
  Running: ["running", "runner", "jogging"],
  Strength: ["strength", "gym trainer", "fitness coach", "personal trainer", "weight training"],
  Swimming: ["swimming", "swim"],
  "Table Tennis": ["table tennis", "ping pong"],
  Tennis: ["tennis", "tenis"],
  Yoga: ["yoga"],
};

const cityAliases: ConceptMap = {
  Lahore: ["lahore", "lahor", "lhr"],
  Islamabad: ["islamabad", "islamabd", "isb"],
  Rawalpindi: ["rawalpindi", "pindi"],
  Karachi: ["karachi", "khi"],
};

const levelAliases: ConceptMap = {
  Beginner: ["beginner", "newbie", "first timer", "first time", "starting out"],
  Intermediate: ["intermediate"],
  Advanced: ["advanced", "competitive"],
};

const formatAliases: ConceptMap = {
  Online: ["online", "virtual", "remote"],
  "In person": ["in person", "face to face", "offline"],
};

const tagAliases: ConceptMap = {
  Batting: ["batting", "batsman", "batter"],
  Serving: ["serving", "serve"],
  "Match preparation": ["match prep", "match preparation", "competition prep"],
  Mobility: ["mobility", "flexibility"],
  Footwork: ["footwork", "movement"],
  Conditioning: ["conditioning", "stamina"],
  Shooting: ["shooting", "shot technique"],
  "Ball handling": ["ball handling", "dribbling"],
};

const dayAliases: ConceptMap = {
  Monday: ["monday", "mon"],
  Tuesday: ["tuesday", "tue", "tues"],
  Wednesday: ["wednesday", "wed"],
  Thursday: ["thursday", "thu", "thur", "thurs"],
  Friday: ["friday", "fri"],
  Saturday: ["saturday", "sat"],
  Sunday: ["sunday", "sun"],
};

const stopWords = new Set([
  "a", "an", "and", "coach", "coaches", "coaching", "for", "help", "in", "me", "need", "on",
  "someone", "the", "trainer", "under", "want", "with", "who", "is", "to", "my",
]);

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasesIn(query: string, concepts: ConceptMap) {
  const found: Array<{ concept: string; alias: string }> = [];
  for (const [concept, aliases] of Object.entries(concepts)) {
    const ordered = [...aliases].sort((first, second) => second.length - first.length);
    const alias = ordered.find((candidate) => new RegExp(`(?:^|\\s)${escapeRegExp(normalize(candidate))}(?:$|\\s)`).test(query));
    if (alias) found.push({ concept, alias: normalize(alias) });
  }
  return found;
}

function uniqueConcept(found: Array<{ concept: string; alias: string }>) {
  const concepts = [...new Set(found.map((entry) => entry.concept))];
  return concepts.length === 1 ? concepts[0] : undefined;
}

function correctionEntries(found: Array<{ concept: string; alias: string }>) {
  return found
    .filter((entry) => normalize(entry.concept) !== entry.alias)
    .map((entry): DiscoveryCorrection => ({ source: entry.alias, target: entry.concept, confidence: "high" }));
}

function removeRecognized(query: string, groups: Array<Array<{ concept: string; alias: string }>>) {
  let residual = ` ${query} `;
  const aliases = groups.flat().map((entry) => entry.alias).sort((first, second) => second.length - first.length);
  for (const alias of aliases) residual = residual.replace(new RegExp(`\\s${escapeRegExp(alias)}(?=\\s)`, "g"), " ");
  return residual
    .replace(/\b(?:cheap|affordable|budget|low cost|below|less than|under)\b/g, " ")
    .replace(/\b\d{3,6}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((term) => term.length > 1 && !stopWords.has(term));
}

export function interpretCoachQuery(input: string): CoachQueryInterpretation {
  const query = normalize(input);
  const sports = aliasesIn(query, sportAliases);
  const cities = aliasesIn(query, cityAliases);
  const levels = aliasesIn(query, levelAliases);
  const formats = aliasesIn(query, formatAliases);
  const tags = aliasesIn(query, tagAliases);
  const days = aliasesIn(query, dayAliases);
  const conflicts: string[] = [];

  if (new Set(sports.map((entry) => entry.concept)).size > 1) conflicts.push("Conflicting sports found. Choose one sport or remove a term.");
  if (new Set(cities.map((entry) => entry.concept)).size > 1) conflicts.push("Conflicting cities found. Choose one city or search all cities.");
  if (new Set(formats.map((entry) => entry.concept)).size > 1) conflicts.push("Conflicting training formats found. Choose online or in person.");
  if (new Set(levels.map((entry) => entry.concept)).size > 1) conflicts.push("Conflicting experience levels found. Choose one level.");
  if (new Set(days.map((entry) => entry.concept)).size > 1) conflicts.push("Multiple preferred days found. Choose one day for a stricter match.");

  const budgetMatch = query.match(/\b(?:under|below|less than)\s*(?:rs\s*)?(\d{3,6})\b/);
  const maxPrice = budgetMatch ? Number(budgetMatch[1]) : undefined;
  const affordability = /\b(?:cheap|affordable|budget|low cost)\b/.test(query);
  const groups = [sports, cities, levels, formats, tags, days];

  return {
    original: input,
    filters: {
      sport: uniqueConcept(sports),
      city: uniqueConcept(cities),
      level: uniqueConcept(levels),
      format: uniqueConcept(formats) as DiscoveryFilters["format"],
      affordability: affordability || undefined,
      maxPrice,
      day: uniqueConcept(days),
      tags: [...new Set(tags.map((entry) => entry.concept))],
    },
    corrections: groups.flatMap(correctionEntries),
    conflicts,
    keywords: removeRecognized(query, groups),
  };
}

function includesCaseInsensitive(values: string[], target: string) {
  const normalizedTarget = normalize(target);
  return values.some((value) => normalize(value) === normalizedTarget);
}

export function recommendCoaches(coaches: Coach[], interpretation: CoachQueryInterpretation): Recommendation[] {
  const filters = interpretation.filters;
  const recommendations = coaches.map((coach): Recommendation => {
    let score = 0;
    const reasons: string[] = [];
    const sportMatch = !filters.sport || includesCaseInsensitive(coach.sports, filters.sport);
    const eligible = sportMatch;

    if (filters.sport && sportMatch) {
      score += 100;
      reasons.push(`Coaches ${filters.sport}`);
    }
    for (const tag of filters.tags) {
      const searchableTags = [...(Array.isArray(coach.tags) ? coach.tags : []), coach.specialty];
      if (searchableTags.some((value) => normalize(value).includes(normalize(tag)))) {
        score += 25;
        reasons.push(`Focuses on ${tag}`);
      }
    }
    if (filters.level && includesCaseInsensitive(Array.isArray(coach.levels) ? coach.levels : [], filters.level)) {
      score += 20;
      reasons.push(`Supports ${filters.level.toLowerCase()} athletes`);
    }
    if (filters.city && normalize(coach.location) === normalize(filters.city)) {
      score += 20;
      reasons.push(`Based in ${filters.city}`);
    }
    if (filters.format) {
      const match = filters.format === "Online" ? coach.offersOnline : coach.offersInPerson;
      if (match) {
        score += 20;
        reasons.push(`Offers ${filters.format.toLowerCase()} coaching`);
      }
    }
    if (filters.maxPrice !== undefined && coach.price <= filters.maxPrice) {
      score += 15;
      reasons.push(`Within your stated budget of Rs ${filters.maxPrice.toLocaleString("en-PK")}`);
    }
    if (filters.day && includesCaseInsensitive(Array.isArray(coach.availability) ? coach.availability : [], filters.day)) {
      score += 10;
      reasons.push(`Lists ${filters.day} availability`);
    }

    const searchable = normalize([
      coach.name, ...coach.sports, ...(Array.isArray(coach.tags) ? coach.tags : []), coach.specialty, coach.bio, coach.location, coach.area,
    ].join(" "));
    const keywordMatches = interpretation.keywords.filter((keyword) => searchable.includes(normalize(keyword)));
    if (keywordMatches.length > 0) {
      score += Math.min(15, keywordMatches.length * 3);
      reasons.push(`Profile mentions ${keywordMatches.slice(0, 3).join(", ")}`);
    }

    const label = !eligible || score === 0
      ? null
      : score >= 80 ? "Strong match" : score >= 35 ? "Good match" : "Possible match";
    return { coach, score, eligible, label, reasons };
  });

  return recommendations.sort((first, second) => {
    if (first.eligible !== second.eligible) return first.eligible ? -1 : 1;
    if (second.score !== first.score) return second.score - first.score;
    if (filters.affordability && first.coach.price !== second.coach.price) return first.coach.price - second.coach.price;
    return first.coach.rank - second.coach.rank || String(first.coach.id).localeCompare(String(second.coach.id));
  });
}
