import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260805153000_phase2b_coach_applications.sql";

async function migration() {
  return readFile(migrationPath, "utf8");
}

describe("coach application migration", () => {
  it("defines an additive coach lifecycle linked to one member identity", async () => {
    const sql = await migration();

    expect(sql).toMatch(/create table public\.coach_applications/i);
    expect(sql).toMatch(/user_id uuid primary key references public\.profiles\(id\)/i);
    expect(sql).toMatch(/DRAFT[\s\S]*SUBMITTED[\s\S]*UNDER_REVIEW[\s\S]*APPROVED[\s\S]*REJECTED[\s\S]*SUSPENDED/i);
    expect(sql).not.toMatch(/alter table public\.profiles[\s\S]*role/i);
  });

  it("enforces owner and administrator boundaries without self-review", async () => {
    const sql = await migration();

    expect(sql).toMatch(/alter table public\.coach_applications enable row level security/i);
    expect(sql).toMatch(/create function public\.is_coachconnect_admin\(\)/i);
    expect(sql).toMatch(/create policy "Members can read their own coach application"/i);
    expect(sql).toMatch(/create policy "Administrators can review coach applications"/i);
    expect(sql).toMatch(/target_user_id = \(select auth\.uid\(\)\)/i);
    expect(sql).toMatch(/Self-review is not allowed/i);
    expect(sql).toMatch(/create policy "Members can edit an open coach application"[\s\S]*status in \('DRAFT', 'REJECTED', 'APPROVED'\)/i);
    expect(sql).toMatch(/grant update \(\s*user_id,/i);
    expect(sql).not.toMatch(/grant update on table public\.coach_applications to authenticated/i);
  });

  it("keeps public registration neutral and allows administrators to identify applicants", async () => {
    const sql = await migration();

    expect(sql).toMatch(/create or replace function public\.handle_new_account\(\)[\s\S]*values \(new\.id, requested_name, 'ATHLETE'\)/i);
    expect(sql).not.toMatch(/requested_role/i);
    expect(sql).toMatch(/grant all on table public\.profiles to service_role/i);
    expect(sql).toMatch(/grant all on table public\.coach_applications to service_role/i);
    expect(sql).toMatch(/create policy "Administrators can read applicant profiles"/i);
  });

  it("requires a complete member-owned draft before submission", async () => {
    const sql = await migration();

    expect(sql).toMatch(/create function public\.submit_coach_application\(\)/i);
    expect(sql).toMatch(/where user_id = \(select auth\.uid\(\)\)/i);
    expect(sql).toMatch(/status in \('DRAFT', 'REJECTED'\)/i);
    expect(sql).toMatch(/application\.headline is null[\s\S]*application\.bio is null[\s\S]*cardinality\(application\.sports\) = 0/i);
    expect(sql).toMatch(/application\.offers_online or application\.offers_in_person/i);
    expect(sql).toMatch(/status = 'SUBMITTED'/i);
    expect(sql).toMatch(/grant execute on function public\.submit_coach_application\(\) to authenticated/i);
  });
});
