import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260806050000_public_coach_catalog.sql";

async function migration() {
  return readFile(migrationPath, "utf8");
}

describe("public coach catalog migration", () => {
  it("publishes only approved privacy-safe coach fields", async () => {
    const sql = await migration();

    expect(sql).toMatch(/create (or replace )?function public\.list_public_coaches\(\)/i);
    expect(sql).toMatch(/where application\.status = 'APPROVED'/i);
    expect(sql).toMatch(/application\.public_name as display_name/i);
    expect(sql).not.toMatch(/join public\.profiles as profile on profile\.id = application\.user_id/i);
    expect(sql).toMatch(/grant execute on function public\.list_public_coaches\(\) to anon, authenticated/i);
    const publicColumns = sql.match(/returns table \(([\s\S]*?)\)\s*language sql/i)?.[1] ?? "";
    expect(publicColumns).not.toMatch(/email/i);
    expect(publicColumns).not.toMatch(/review_note/i);
    expect(publicColumns).not.toMatch(/longitude/i);
    expect(publicColumns).not.toMatch(/latitude/i);
  });

  it("returns approved coach edits to review before publication", async () => {
    const sql = await migration();

    expect(sql).toMatch(/old\.status = 'APPROVED'/i);
    expect(sql).toMatch(/current_public_name is distinct from old\.public_name/i);
    expect(sql).toMatch(/new\.public_name := current_public_name/i);
    expect(sql).toMatch(/new\.status := 'SUBMITTED'/i);
    expect(sql).toMatch(/\(select auth\.uid\(\)\) = old\.user_id/i);
    expect(sql).toMatch(/create trigger coach_applications_require_review_after_edit/i);
  });

  it("limits administrator reads to reviewable applications and their applicants", async () => {
    const sql = await migration();
    expect(sql).toMatch(/drop policy if exists "Administrators can review coach applications"/i);
    expect(sql).toMatch(/create policy "Administrators can review coach applications"[\s\S]*for select[\s\S]*status <> 'DRAFT'/i);
    expect(sql).toMatch(/drop policy if exists "Administrators can read applicant profiles"/i);
    expect(sql).toMatch(/exists \(\s*select 1\s*from public\.coach_applications/i);
  });

  it("enforces nested public-profile shapes in PostgreSQL and records moderation transitions", async () => {
    const sql = await migration();
    expect(sql).toMatch(/check \(public\.is_valid_coach_availability\(availability\)\)/i);
    expect(sql).toMatch(/check \(public\.is_valid_coach_faqs\(faqs\)\)/i);
    expect(sql).toMatch(/jsonb_typeof\(item -> 'question'\) is distinct from 'string'/i);
    expect(sql).toMatch(/jsonb_typeof\(item -> 'answer'\) is distinct from 'string'/i);
    expect(sql).toMatch(/create table if not exists public\.coach_moderation_events/i);
    expect(sql).toMatch(/insert into public\.coach_moderation_events/i);
    expect(sql).toMatch(/actor_name text not null/i);
    expect(sql).toMatch(/using \(\(select public\.is_coachconnect_admin\(\)\)\)/i);
  });

  it("allows administrators to restore a suspended coach without allowing self-review", async () => {
    const sql = await migration();

    expect(sql).toMatch(/decision = 'APPROVED'[\s\S]*status in \('SUBMITTED', 'UNDER_REVIEW', 'SUSPENDED'\)/i);
    expect(sql).toMatch(/decision = 'APPROVED' and previous_status = 'SUSPENDED' then review_note/i);
    expect(sql).toMatch(/target_user_id = \(select auth\.uid\(\)\)[\s\S]*Self-review is not allowed/i);
  });
});
