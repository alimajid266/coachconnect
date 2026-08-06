import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260806120000_marketplace_profile_expansion.sql";

async function migration() {
  return readFile(migrationPath, "utf8");
}

describe("marketplace profile expansion migration", () => {
  it("adds flexible moderated sports, tags, image paths, and approximate map coordinates", async () => {
    const sql = await migration();
    expect(sql).toMatch(/add column if not exists tags text\[\]/i);
    expect(sql).toMatch(/add column if not exists profile_image_path text/i);
    expect(sql).toMatch(/add column if not exists public_longitude double precision/i);
    expect(sql).toMatch(/add column if not exists public_latitude double precision/i);
    expect(sql).toMatch(/cardinality\(sports\)[\s\S]*between 1 and 8/i);
    expect(sql).toMatch(/cardinality\(tags\)[\s\S]*between 0 and 12/i);
  });

  it("publishes new fields only through approved public coach functions", async () => {
    const sql = await migration();
    const publicList = sql.match(/create or replace function public\.list_public_coaches\(\)([\s\S]*?)\n\$\$;/i)?.[1] ?? "";
    expect(publicList).not.toBe("");
    expect(sql).toMatch(/drop function if exists public\.get_public_coach\(uuid\)[\s\S]*drop function if exists public\.list_public_coaches\(\)/i);
    expect(sql).toMatch(/create or replace function public\.get_public_coach\(target_user_id uuid\)/i);
    expect(publicList).toMatch(/where application\.status = 'APPROVED'/i);
    expect(publicList).toMatch(/application\.tags/i);
    expect(publicList).toMatch(/application\.profile_image_path/i);
    expect(publicList).not.toMatch(/review_note/i);
    expect(publicList).not.toMatch(/reviewed_by/i);
  });

  it("requires public-field edits including tags, image, and map point to return to review", async () => {
    const sql = await migration();
    expect(sql).toMatch(/require_review_after_approved_coach_edit/i);
    expect(sql).toMatch(/new\.tags[\s\S]*old\.tags/i);
    expect(sql).toMatch(/new\.profile_image_path[\s\S]*old\.profile_image_path/i);
    expect(sql).toMatch(/new\.public_longitude[\s\S]*old\.public_longitude/i);
  });

  it("creates a private server-write bucket with owner and approved read boundaries", async () => {
    const sql = await migration();
    expect(sql).toMatch(/insert into storage\.buckets[\s\S]*'coach-profile-images'[\s\S]*false/i);
    expect(sql).toMatch(/\(storage\.foldername\(name\)\)\[1\][\s\S]*auth\.uid\(\)/i);
    expect(sql).toMatch(/is_approved_coach_profile_image/i);
    expect(sql).toMatch(/split_part\(profile_image_path, '\/', 1\) = user_id::text/i);
    expect(sql).not.toMatch(/create policy "Members (?:upload|replace|delete)/i);
    expect(sql).toMatch(/coach_profile_image_upload_limits[\s\S]*enable row level security/i);
    expect(sql).toMatch(/reserve_coach_profile_image_upload[\s\S]*upload_count < 20[\s\S]*interval '30 seconds'/i);
    expect(sql).toMatch(/grant execute on function public\.reserve_coach_profile_image_upload\(uuid\) to service_role/i);
    expect(sql).toMatch(/revoke all on function public\.reserve_coach_profile_image_upload\(uuid\) from public, anon, authenticated/i);
    expect(sql).toMatch(/file_size_limit[\s\S]*5242880/i);
  });
});
