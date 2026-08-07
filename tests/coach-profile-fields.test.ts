import { describe, expect, it } from "vitest";
import { normalizeCoachApplicationDraft, serializeCoachApplication } from "@/lib/coach-application";

const baseDraft = {
  headline: "Patient squash coaching for confident match play",
  bio: "A detailed coaching biography that is intentionally long enough for submission and explains a practical, supportive approach.",
  sports: ["  Squash  ", "Tennis", "squash"],
  tags: [" Match preparation ", "Beginners", "match preparation"],
  experienceYears: "6",
  qualifications: "Recognized coaching qualification",
  audiences: ["Adults"],
  levels: ["Beginner"],
  lessonPlan: "Warm up, assess one skill, practise it, and finish with clear next steps.",
  sessionPricePkr: "4000",
  offersOnline: true,
  offersInPerson: false,
  city: "",
  publicArea: "",
  profileImagePath: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
  adImagePaths: [
    "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
    "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.webp",
  ],
};

describe("expanded coach profile fields", () => {
  it("accepts normalized custom sports and tags without a fixed twelve-sport allowlist", () => {
    expect(normalizeCoachApplicationDraft(baseDraft)).toMatchObject({
      sports: ["Squash", "Tennis"],
      tags: ["Match preparation", "Beginners"],
      ad_image_paths: baseDraft.adImagePaths,
    });
  });

  it("rejects reserved trust claims and unsafe image paths", () => {
    expect(() => normalizeCoachApplicationDraft({ ...baseDraft, tags: ["CoachConnect verified"] })).toThrow(/reserved/i);
    expect(() => normalizeCoachApplicationDraft({ ...baseDraft, profileImagePath: "../private.jpg" })).toThrow(/image/i);
    expect(() => normalizeCoachApplicationDraft({ ...baseDraft, adImagePaths: [...baseDraft.adImagePaths, "../private.jpg"] })).toThrow(/image/i);
    expect(() => normalizeCoachApplicationDraft({ ...baseDraft, adImagePaths: Array(6).fill(baseDraft.adImagePaths[0]) })).toThrow(/five/i);
  });

  it("serializes the new fields for the owner and administrator interfaces", () => {
    expect(serializeCoachApplication({
      user_id: "coach-id",
      status: "DRAFT",
      tags: ["Batting"],
      profile_image_path: "coach-id/image.webp",
      ad_image_paths: ["coach-id/ad-1.webp", "coach-id/ad-2.webp"],
      public_longitude: 74.35,
      public_latitude: 31.52,
    })).toMatchObject({
      tags: ["Batting"],
      profileImagePath: "coach-id/image.webp",
      adImagePaths: ["coach-id/ad-1.webp", "coach-id/ad-2.webp"],
      publicLongitude: 74.35,
      publicLatitude: 31.52,
    });
  });
});
