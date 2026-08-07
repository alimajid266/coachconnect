import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { illustrativeImageForSports } from "@/lib/coaches";

const expected = {
  Badminton: "/images/coach-hira.jpg",
  Basketball: "/images/coach-usman.jpg",
  Boxing: "/images/coach-mariam.jpg",
  Cricket: "/images/coach-ayesha.jpg",
  Football: "/images/coach-danish.jpg",
  Running: "/images/coach-nadia.jpg",
  Strength: "/images/coach-sara.jpg",
  Swimming: "/images/coach-farhan.jpg",
  "Table Tennis": "/images/coach-iqra.jpg",
  Tennis: "/images/coach-hamza.jpg",
  Yoga: "/images/coach-rida.jpg",
} as const;

describe("Demo illustrative sport imagery", () => {
  it.each(Object.entries(expected))("maps %s to an existing, sport-appropriate asset", (sport, image) => {
    expect(illustrativeImageForSports([sport])).toBe(image);
    expect(existsSync(`public${image}`)).toBe(true);
  });

  it("always supplies a neutral fallback for an unforeseen demo sport", () => {
    expect(illustrativeImageForSports(["Squash"])).toBe("/images/hero-training.jpg");
    expect(existsSync("public/images/hero-training.jpg")).toBe(true);
  });
});
