import { describe, expect, it } from "vitest";
import { coaches } from "@/lib/coaches";
import { interpretCoachQuery, recommendCoaches } from "@/lib/coach-discovery";

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
});
