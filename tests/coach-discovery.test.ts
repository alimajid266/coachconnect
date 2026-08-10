import { describe, expect, it } from "vitest";
import { coaches } from "@/lib/coaches";
import { RECOMMENDATION_WEIGHTS, interpretCoachQuery, recommendCoaches, recommendCoachesForPreferences } from "@/lib/coach-discovery";

describe("coach discovery interpreter", () => {
  it.each([
    ["criket", "Cricket"],
    ["tenis", "Tennis"],
    ["badmiton", "Badminton"],
    ["soccer", "Football"],
    ["footy", "Football"],
    ["gym trainer", "Strength"],
    ["fitness coach", "Strength"],
  ])("interprets %s as the %s sport", (query, sport) => {
    const result = interpretCoachQuery(query);
    expect(result.filters.sport).toBe(sport);
    expect(result.corrections.some((correction) => correction.target === sport)).toBe(true);
  });

  it.each([
    ["lahor", "Lahore"],
    ["Lhr", "Lahore"],
    ["islamabd", "Islamabad"],
    ["Isb", "Islamabad"],
    ["Pindi", "Rawalpindi"],
    ["Khi", "Karachi"],
  ])("interprets %s as %s", (query, city) => {
    expect(interpretCoachQuery(`coach in ${query}`).filters.city).toBe(city);
  });

  it.each([
    ["iflamabad", "Islamabad"],
    ["karahci", "Karachi"],
  ])("corrects previously unseen city misspelling %s to %s", (query, city) => {
    const result = interpretCoachQuery(`coach in ${query}`);
    expect(result.filters.city).toBe(city);
    expect(result.corrections).toContainEqual(expect.objectContaining({ source: query, target: city }));
  });

  it.each([
    ["swiming", "Swimming"],
    ["baskteball", "Basketball"],
  ])("corrects previously unseen sport misspelling %s to %s", (query, sport) => {
    const result = interpretCoachQuery(query);
    expect(result.filters.sport).toBe(sport);
    expect(result.corrections).toContainEqual(expect.objectContaining({ source: query, target: sport }));
  });

  it("does not guess from ambiguous or very short fragments", () => {
    const result = interpretCoachQuery("coach in is for box");
    expect(result.filters.city).toBeUndefined();
    expect(result.filters.sport).toBeUndefined();
    expect(result.corrections).toEqual([]);
    expect(result.keywords).toContain("box");
  });

  it("recognizes level, format, affordability, specialty, and day without inventing a budget", () => {
    const result = interpretCoachQuery("cheap newbie virtual batting coach on saturday");
    expect(result.filters).toMatchObject({
      level: "Beginner",
      format: "Online",
      affordability: true,
      day: "Saturday",
    });
    expect(result.filters.tags).toContain("Batting");
    expect(result.filters.maxPrice).toBeUndefined();
  });

  it("keeps incomplete searches useful", () => {
    expect(interpretCoachQuery("coach in Lahore").filters.city).toBe("Lahore");
    expect(interpretCoachQuery("cheap tennis").filters).toMatchObject({ sport: "Tennis", affordability: true });
    expect(interpretCoachQuery("beginner online").filters).toMatchObject({ level: "Beginner", format: "Online" });
    expect(interpretCoachQuery("need help with batting").filters.tags).toContain("Batting");
  });

  it("recognizes catalog-defined sports and cities instead of relying on a fixed list", () => {
    const result = interpretCoachQuery("archery coach in Faisalabad under Rs 5k", {
      sports: ["Archery", "Cricket"],
      cities: ["Faisalabad", "Lahore"],
    });
    expect(result.filters).toMatchObject({ sport: "Archery", city: "Faisalabad", maxPrice: 5000 });
  });

  it.each([
    ["up to PKR 4,500", 4500],
    ["maximum 6k", 6000],
    ["budget of 3500 rupees", 3500],
  ])("understands natural budget phrase %s", (query, maxPrice) => {
    const result = interpretCoachQuery(`tennis coach ${query}`);
    expect(result.filters.maxPrice).toBe(maxPrice);
    expect(result.keywords).toEqual([]);
  });

  it("understands training-goal and one-to-one phrases", () => {
    const result = interpretCoachQuery("one-to-one coach for weight loss and recovery");
    expect(result.filters.format).toBe("In person");
    expect(result.filters.tags).toEqual(expect.arrayContaining(["Conditioning", "Mobility"]));
  });

  it("gives an exact catalog sport priority over a legacy alias", () => {
    expect(interpretCoachQuery("soccer coach", { sports: ["Soccer", "Football"] }).filters.sport).toBe("Soccer");
    expect(interpretCoachQuery("ping pong coach", { sports: ["Ping Pong", "Table Tennis"] }).filters.sport).toBe("Ping Pong");
    expect(interpretCoachQuery("cricket coach", { sports: ["cricket"] }).filters.sport).toBe("Cricket");
  });

  it("surfaces conflicting requirements instead of silently choosing", () => {
    const result = interpretCoachQuery("online face-to-face cricket tennis in Lahore Karachi");
    expect(result.conflicts).toEqual(expect.arrayContaining([
      expect.stringMatching(/format/i),
      expect.stringMatching(/sport/i),
      expect.stringMatching(/city/i),
    ]));
    expect(result.filters.format).toBeUndefined();
    expect(result.filters.sport).toBeUndefined();
    expect(result.filters.city).toBeUndefined();
  });

  it("retains unknown low-confidence language as keyword text", () => {
    const result = interpretCoachQuery("patient coach for wristy shots");
    expect(result.keywords).toEqual(expect.arrayContaining(["patient", "wristy", "shots"]));
  });
});

describe("deterministic coach recommendations", () => {
  it("publishes the exact deterministic recommendation weightages", () => {
    expect(RECOMMENDATION_WEIGHTS).toEqual({
      sport: 100,
      focusTag: 25,
      level: 20,
      city: 20,
      format: 20,
      budget: 15,
      day: 10,
      keyword: 3,
      keywordCap: 15,
    });
  });

  it("rotates equal positive-score profiles daily so one account is not permanently first", () => {
    const tiedCoaches = coaches.slice(0, 3).map((coach, index) => ({ ...coach, location: "Lahore", rank: index + 1 }));
    const interpretation = interpretCoachQuery("coach in Lahore");
    const firstProfiles = ["2026-08-08", "2026-08-09", "2026-08-10"].map(
      (rotationSeed) => recommendCoaches(tiedCoaches, interpretation, { rotationSeed })[0].coach.id,
    );

    expect(new Set(firstProfiles)).toEqual(new Set(tiedCoaches.map((coach) => coach.id)));
  });

  it("rotates fairly inside a score subgroup even when other scores intervene", () => {
    const mixed = [
      { ...coaches[0], id: "ali-majid2", location: "Lahore", rank: 1 },
      { ...coaches[1], id: "lower-a", location: "Karachi", rank: 2 },
      { ...coaches[2], id: "tied-peer", location: "Lahore", rank: 3 },
      { ...coaches[3], id: "lower-b", location: "Islamabad", rank: 4 },
    ];
    const interpretation = interpretCoachQuery("coach in Lahore");
    const firstProfiles = ["2026-08-08", "2026-08-09"].map(
      (rotationSeed) => recommendCoaches(mixed, interpretation, { rotationSeed })[0].coach.id,
    );

    expect(new Set(firstProfiles)).toEqual(new Set(["ali-majid2", "tied-peer"]));
  });

  it("returns every coach, ranks explicit matches first, and explains them qualitatively", () => {
    const interpretation = interpretCoachQuery("affordable beginner cricket coach in Lahore on Saturday");
    const ranked = recommendCoaches(coaches, interpretation);
    expect(ranked).toHaveLength(coaches.length);
    expect(ranked[0].coach.id).toBe("ayesha-khan");
    expect(ranked[0].label).toMatch(/Strong match|Good match/);
    expect(ranked[0].reasons).toEqual(expect.arrayContaining([
      expect.stringMatching(/Cricket/i),
      expect.stringMatching(/Lahore/i),
      expect.stringMatching(/Saturday/i),
    ]));
    expect(ranked.every((result) => !/%/.test(result.label ?? ""))).toBe(true);
  });

  it("uses a numeric budget only when the member supplied one", () => {
    const ranked = recommendCoaches(coaches, interpretCoachQuery("tennis under 3500"));
    expect(ranked[0].coach.price).toBeLessThanOrEqual(3500);
    expect(ranked[0].reasons.some((reason) => /budget/i.test(reason))).toBe(true);
  });

  it("ranks saved member preferences without hiding the rest of the catalog", () => {
    const ranked = recommendCoachesForPreferences(coaches, {
      interests: ["Cricket"],
      preferredLocation: "Lahore",
      maxBudgetPkr: 3500,
      trainingGoal: "Improve batting",
      experienceLevel: "Beginner",
    }, { rotationSeed: "2026-08-09" });

    expect(ranked).toHaveLength(coaches.length);
    expect(ranked[0].coach.id).toBe("ayesha-khan");
    expect(ranked[0].reasons).toEqual(expect.arrayContaining([
      expect.stringMatching(/Cricket interest/i),
      expect.stringMatching(/Lahore/i),
      expect.stringMatching(/budget/i),
    ]));
    expect(ranked[0].label).not.toBeNull();
  });

  it("keeps zero-match approved coaches ahead of zero-match demos for saved preferences", () => {
    const mixed = [
      { ...coaches[0], id: "approved-later", isDemo: false, rank: 20 },
      { ...coaches[1], id: "demo-first", isDemo: true, rank: 1 },
      { ...coaches[2], id: "approved-first", isDemo: false, rank: 10 },
    ];
    const ranked = recommendCoachesForPreferences(mixed, {
      interests: [],
      preferredLocation: "",
      maxBudgetPkr: 0,
      trainingGoal: "",
      experienceLevel: "",
    }, { rotationSeed: "2026-08-09" });

    expect(ranked.map((entry) => entry.coach.id)).toEqual(["approved-first", "approved-later", "demo-first"]);
    expect(ranked.every((entry) => entry.score === 0 && !entry.eligible)).toBe(true);
  });
});
