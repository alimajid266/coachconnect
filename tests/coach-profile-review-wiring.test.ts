import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/coaches/[id]/page.tsx", "utf8");

describe("coach profile review wiring", () => {
  it("loads public reviews and renders them after the profile FAQ near the end", () => {
    expect(source).toMatch(/loadPublicCoachReviews/);
    const faqPosition = source.indexOf("catalog-profile-faq");
    const reviewsPosition = source.indexOf("<CoachReviewList");
    expect(faqPosition).toBeGreaterThan(-1);
    expect(reviewsPosition).toBeGreaterThan(faqPosition);
  });
});
