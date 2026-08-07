import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260807050000_member_avatars_and_coach_ads.sql";

describe("member avatars and coach ad media migration", () => {
  it("adds owner-bound avatars and a bounded coach ad gallery", async () => {
    const sql = await readFile(path, "utf8");
    expect(sql).toMatch(/add column if not exists avatar_path text/i);
    expect(sql).toMatch(/grant update \(avatar_path\)[\s\S]*profiles to authenticated/i);
    expect(sql).toMatch(/split_part\(avatar_path, '\/', 1\) = id::text/i);
    expect(sql).toMatch(/add column if not exists ad_image_paths text\[\]/i);
    expect(sql).toMatch(/cardinality\(ad_image_paths\) <= 5/i);
    expect(sql).toMatch(/from unnest\(coalesce\(paths/i);
    expect(sql).toMatch(/application\.status = 'APPROVED'/i);
    expect(sql).toMatch(/create or replace function public\.attach_coach_ad_image/i);
    expect(sql).toMatch(/cardinality\(current_paths\) >= 5/i);
  });
});
