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
export type DiscoveryVocabulary = {
  sports?: string[];
  cities?: string[];
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

export const RECOMMENDATION_WEIGHTS = {
  sport: 100,
  focusTag: 25,
  level: 20,
  city: 20,
  format: 20,
  budget: 15,
  day: 10,
  keyword: 3,
  keywordCap: 15,
} as const;

export type CoachRecommendationPreferences = {
  interests: string[];
  preferredLocation: string;
  maxBudgetPkr: number;
  trainingGoal: string;
  experienceLevel: string;
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
  "In person": ["in person", "face to face", "offline", "one to one", "one on one", "physical session"],
};

const tagAliases: ConceptMap = {
  Batting: ["batting", "batsman", "batter"],
  Serving: ["serving", "serve"],
  "Match preparation": ["match prep", "match preparation", "competition prep"],
  Mobility: ["mobility", "flexibility", "recovery", "rehab", "rehabilitation"],
  Footwork: ["footwork", "movement"],
  Conditioning: ["conditioning", "stamina", "weight loss", "lose weight", "fat loss"],
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

function withVocabulary(base: ConceptMap, values: string[] = []) {
  const concepts: Record<string, string[]> = Object.fromEntries(
    Object.entries(base).map(([concept, aliases]) => [concept, [...aliases]]),
  );
  for (const value of values) {
    const catalogConcept = value.trim();
    const normalizedCatalogConcept = normalize(catalogConcept);
    if (!normalizedCatalogConcept) continue;
    const existingConcept = Object.keys(concepts).find((concept) => normalize(concept) === normalizedCatalogConcept);
    const targetConcept = existingConcept ?? catalogConcept;
    for (const concept of Object.keys(concepts)) {
      if (concept === targetConcept) continue;
      concepts[concept] = concepts[concept].filter((alias) => normalize(alias) !== normalizedCatalogConcept);
    }
    concepts[targetConcept] = [...new Set([...(concepts[targetConcept] ?? []), normalizedCatalogConcept])];
  }
  return concepts;
}

function naturalBudget(input: string) {
  const match = input.toLowerCase().match(
    /\b(?:under|below|less\s+than|up\s+to|max(?:imum)?|budget(?:\s+of)?|around)\s*(?:pkr|rs\.?|rupees?)?\s*([0-9][0-9,]*(?:\.[0-9]+)?\s*k?)\b/i,
  );
  if (!match) return undefined;
  const token = match[1].replace(/[\s,]/g, "").toLowerCase();
  const multiplier = token.endsWith("k") ? 1000 : 1;
  const amount = Number(token.replace(/k$/, "")) * multiplier;
  return Number.isFinite(amount) && amount >= 500 && amount <= 1_000_000 ? Math.round(amount) : undefined;
}

type ConceptMatch = {
  concept: string;
  alias: string;
  confidence: DiscoveryConfidence;
};

function damerauLevenshtein(first: string, second: string) {
  const rows = first.length + 1;
  const columns = second.length + 1;
  const distance = Array.from({ length: rows }, () => Array<number>(columns).fill(0));
  for (let row = 0; row < rows; row += 1) distance[row][0] = row;
  for (let column = 0; column < columns; column += 1) distance[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1;
      distance[row][column] = Math.min(
        distance[row - 1][column] + 1,
        distance[row][column - 1] + 1,
        distance[row - 1][column - 1] + substitutionCost,
      );
      if (
        row > 1
        && column > 1
        && first[row - 1] === second[column - 2]
        && first[row - 2] === second[column - 1]
      ) {
        distance[row][column] = Math.min(distance[row][column], distance[row - 2][column - 2] + 1);
      }
    }
  }
  return distance[first.length][second.length];
}

function fuzzyThreshold(length: number) {
  if (length <= 3) return 0;
  if (length <= 8) return 1;
  return 2;
}

function fuzzyConceptsIn(query: string, concepts: ConceptMap, exact: ConceptMatch[]) {
  const exactConcepts = new Set(exact.map((entry) => entry.concept));
  const found: ConceptMatch[] = [];
  for (const source of query.split(" ")) {
    const threshold = fuzzyThreshold(source.length);
    if (threshold === 0 || stopWords.has(source) || /^\d+$/.test(source)) continue;
    const candidates = Object.keys(concepts)
      .map((concept) => ({ concept, target: normalize(concept) }))
      .filter(({ concept, target }) => !exactConcepts.has(concept) && !target.includes(" ") && target !== source)
      .map(({ concept, target }) => ({ concept, distance: damerauLevenshtein(source, target) }))
      .filter((candidate) => candidate.distance <= threshold)
      .sort((first, second) => first.distance - second.distance || first.concept.localeCompare(second.concept));
    const best = candidates[0];
    if (!best || (candidates[1] && candidates[1].distance === best.distance)) continue;
    found.push({
      concept: best.concept,
      alias: source,
      confidence: best.distance === 1 ? "high" : "medium",
    });
    exactConcepts.add(best.concept);
  }
  return found;
}

function aliasesIn(query: string, concepts: ConceptMap) {
  const exact: ConceptMatch[] = [];
  for (const [concept, aliases] of Object.entries(concepts)) {
    const ordered = [...aliases].sort((first, second) => second.length - first.length);
    const alias = ordered.find((candidate) => new RegExp(`(?:^|\\s)${escapeRegExp(normalize(candidate))}(?:$|\\s)`).test(query));
    if (alias) exact.push({ concept, alias: normalize(alias), confidence: "high" });
  }
  return [...exact, ...fuzzyConceptsIn(query, concepts, exact)];
}

function uniqueConcept(found: ConceptMatch[]) {
  const concepts = [...new Set(found.map((entry) => entry.concept))];
  return concepts.length === 1 ? concepts[0] : undefined;
}

function correctionEntries(found: ConceptMatch[]) {
  return found
    .filter((entry) => normalize(entry.concept) !== entry.alias)
    .map((entry): DiscoveryCorrection => ({ source: entry.alias, target: entry.concept, confidence: entry.confidence }));
}

function removeRecognized(query: string, groups: ConceptMatch[][]) {
  let residual = ` ${query} `;
  const aliases = groups.flat().map((entry) => entry.alias).sort((first, second) => second.length - first.length);
  for (const alias of aliases) residual = residual.replace(new RegExp(`\\s${escapeRegExp(alias)}(?=\\s)`, "g"), " ");
  return residual
    .replace(/\b(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?|around)\s*(?:pkr|rs|rupees?)?\s*[0-9][0-9\s]*k?\s*(?:pkr|rs|rupees?)?\b/g, " ")
    .replace(/\b(?:cheap|affordable|budget|low cost|below|less than|under)\b/g, " ")
    .replace(/\b\d{3,6}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((term) => term.length > 1 && !stopWords.has(term));
}

export function interpretCoachQuery(input: string, vocabulary: DiscoveryVocabulary = {}): CoachQueryInterpretation {
  const query = normalize(input);
  const sports = aliasesIn(query, withVocabulary(sportAliases, vocabulary.sports));
  const cities = aliasesIn(query, withVocabulary(cityAliases, vocabulary.cities));
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

  const maxPrice = naturalBudget(input);
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

export function fairDailyTieOrder(ids: string[], rotationSeed = new Date().toISOString().slice(0, 10)) {
  const stableIds = [...ids].sort((first, second) => first.localeCompare(second));
  const parsedSeed = Date.parse(`${rotationSeed}T00:00:00Z`);
  const dayNumber = Number.isFinite(parsedSeed) ? Math.floor(parsedSeed / 86_400_000) : 0;
  const rotationOffset = stableIds.length > 0 ? ((dayNumber % stableIds.length) + stableIds.length) % stableIds.length : 0;
  return new Map(stableIds.map((id, index) => [id, (index - rotationOffset + stableIds.length) % stableIds.length]));
}

export function fairDailyBucketTieOrder(entries: Array<{ id: string; bucket: string }>, rotationSeed?: string) {
  const buckets = new Map<string, string[]>();
  for (const entry of entries) buckets.set(entry.bucket, [...(buckets.get(entry.bucket) ?? []), entry.id]);
  const order = new Map<string, number>();
  for (const ids of buckets.values()) {
    for (const [id, rank] of fairDailyTieOrder(ids, rotationSeed)) order.set(id, rank);
  }
  return order;
}

export function recommendCoaches(
  coaches: Coach[],
  interpretation: CoachQueryInterpretation,
  options: { rotationSeed?: string } = {},
): Recommendation[] {
  const filters = interpretation.filters;
  const rotationSeed = options.rotationSeed ?? new Date().toISOString().slice(0, 10);
  const recommendations = coaches.map((coach): Recommendation => {
    let score = 0;
    const reasons: string[] = [];
    const sportMatch = !filters.sport || includesCaseInsensitive(coach.sports, filters.sport);
    const eligible = sportMatch;

    if (filters.sport && sportMatch) {
      score += RECOMMENDATION_WEIGHTS.sport;
      reasons.push(`Coaches ${filters.sport}`);
    }
    for (const tag of filters.tags) {
      const searchableTags = [...(Array.isArray(coach.tags) ? coach.tags : []), coach.specialty];
      if (searchableTags.some((value) => normalize(value).includes(normalize(tag)))) {
        score += RECOMMENDATION_WEIGHTS.focusTag;
        reasons.push(`Focuses on ${tag}`);
      }
    }
    if (filters.level && includesCaseInsensitive(Array.isArray(coach.levels) ? coach.levels : [], filters.level)) {
      score += RECOMMENDATION_WEIGHTS.level;
      reasons.push(`Supports ${filters.level.toLowerCase()} athletes`);
    }
    if (filters.city && normalize(coach.location) === normalize(filters.city)) {
      score += RECOMMENDATION_WEIGHTS.city;
      reasons.push(`Based in ${filters.city}`);
    }
    if (filters.format) {
      const match = filters.format === "Online" ? coach.offersOnline : coach.offersInPerson;
      if (match) {
        score += RECOMMENDATION_WEIGHTS.format;
        reasons.push(`Offers ${filters.format.toLowerCase()} coaching`);
      }
    }
    if (filters.maxPrice !== undefined && coach.price <= filters.maxPrice) {
      score += RECOMMENDATION_WEIGHTS.budget;
      reasons.push(`Within your stated budget of Rs ${filters.maxPrice.toLocaleString("en-PK")}`);
    }
    if (filters.day && includesCaseInsensitive(Array.isArray(coach.availability) ? coach.availability : [], filters.day)) {
      score += RECOMMENDATION_WEIGHTS.day;
      reasons.push(`Lists ${filters.day} availability`);
    }

    const searchable = normalize([
      coach.name, ...coach.sports, ...(Array.isArray(coach.tags) ? coach.tags : []), coach.specialty, coach.bio, coach.location, coach.area,
    ].join(" "));
    const keywordMatches = interpretation.keywords.filter((keyword) => searchable.includes(normalize(keyword)));
    if (keywordMatches.length > 0) {
      score += Math.min(RECOMMENDATION_WEIGHTS.keywordCap, keywordMatches.length * RECOMMENDATION_WEIGHTS.keyword);
      reasons.push(`Profile mentions ${keywordMatches.slice(0, 3).join(", ")}`);
    }

    const label = !eligible || score === 0
      ? null
      : score >= 80 ? "Strong match" : score >= 35 ? "Good match" : "Possible match";
    return { coach, score, eligible, label, reasons };
  });
  const fairTieOrder = fairDailyBucketTieOrder(recommendations.map((entry) => ({
    id: String(entry.coach.id),
    bucket: `${entry.eligible}:${entry.score}:${filters.affordability ? entry.coach.price : "any-price"}`,
  })), rotationSeed);

  return recommendations.sort((first, second) => {
    if (first.eligible !== second.eligible) return first.eligible ? -1 : 1;
    if (second.score !== first.score) return second.score - first.score;
    if (filters.affordability && first.coach.price !== second.coach.price) return first.coach.price - second.coach.price;
    if (first.score === 0 && second.score === 0) {
      if (first.coach.isDemo !== second.coach.isDemo) return first.coach.isDemo ? 1 : -1;
      return first.coach.rank - second.coach.rank || String(first.coach.id).localeCompare(String(second.coach.id));
    }
    return (fairTieOrder.get(String(first.coach.id)) ?? 0) - (fairTieOrder.get(String(second.coach.id)) ?? 0);
  });
}

export function recommendCoachesForPreferences(
  coaches: Coach[],
  preferences: CoachRecommendationPreferences,
  options: { rotationSeed?: string } = {},
): Recommendation[] {
  const goal = interpretCoachQuery(preferences.trainingGoal);
  const rotationSeed = options.rotationSeed ?? new Date().toISOString().slice(0, 10);
  const recommendations = coaches.map((coach): Recommendation => {
    let score = 0;
    const reasons: string[] = [];
    const matchingInterest = preferences.interests.find((interest) => includesCaseInsensitive(coach.sports, interest));
    if (matchingInterest) {
      score += RECOMMENDATION_WEIGHTS.sport;
      reasons.push(`Matches your ${matchingInterest} interest`);
    }
    if (preferences.preferredLocation && normalize(coach.location) === normalize(preferences.preferredLocation)) {
      score += RECOMMENDATION_WEIGHTS.city;
      reasons.push(`Based in ${preferences.preferredLocation}`);
    }
    if (preferences.experienceLevel && includesCaseInsensitive(coach.levels, preferences.experienceLevel)) {
      score += RECOMMENDATION_WEIGHTS.level;
      reasons.push(`Supports your ${preferences.experienceLevel.toLowerCase()} level`);
    }
    if (Number.isFinite(preferences.maxBudgetPkr) && preferences.maxBudgetPkr > 0 && coach.price <= preferences.maxBudgetPkr) {
      score += RECOMMENDATION_WEIGHTS.budget;
      reasons.push(`Within your saved budget of Rs ${preferences.maxBudgetPkr.toLocaleString("en-PK")}`);
    }
    const searchable = normalize([coach.name, ...coach.sports, ...coach.tags, coach.specialty, coach.bio].join(" "));
    const goalTerms = [...goal.filters.tags, ...goal.keywords];
    const goalMatches = goalTerms.filter((term) => searchable.includes(normalize(term)));
    if (goalMatches.length > 0) {
      score += Math.min(RECOMMENDATION_WEIGHTS.keywordCap, goalMatches.length * RECOMMENDATION_WEIGHTS.keyword);
      reasons.push(`Matches your goal: ${goalMatches.slice(0, 2).join(", ")}`);
    }
    const eligible = score > 0;
    const label = !eligible ? null : score >= 80 ? "Strong match" : score >= 35 ? "Good match" : "Possible match";
    return { coach, score, eligible, label, reasons };
  });
  const fairTieOrder = fairDailyBucketTieOrder(recommendations.map((entry) => ({
    id: String(entry.coach.id),
    bucket: String(entry.score),
  })), rotationSeed);
  return recommendations.sort((first, second) => {
    if (second.score !== first.score) return second.score - first.score;
    if (first.score === 0 && second.score === 0) {
      if (first.coach.isDemo !== second.coach.isDemo) return first.coach.isDemo ? 1 : -1;
      return first.coach.rank - second.coach.rank || String(first.coach.id).localeCompare(String(second.coach.id));
    }
    return (fairTieOrder.get(String(first.coach.id)) ?? 0) - (fairTieOrder.get(String(second.coach.id)) ?? 0);
  });
}
