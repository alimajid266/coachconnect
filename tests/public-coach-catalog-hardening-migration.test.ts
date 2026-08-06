import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260806111500_catalog_security_hardening.sql";

async function migration() {
  return readFile(migrationPath, "utf8");
}

describe("public coach catalog security hardening", () => {
  it("allows only question and answer keys and projects FAQs inside the anonymous RPC", async () => {
    const sql = await migration();

    expect(sql).toMatch(/item is distinct from jsonb_build_object\(\s*'question'/i);
    expect(sql).toMatch(/jsonb_agg\(\s*jsonb_build_object\(\s*'question'/i);
    expect(sql).toMatch(/from jsonb_array_elements\(application\.faqs\)/i);
    expect(sql).not.toMatch(/\n\s*application\.faqs,\n/i);
    expect(sql).toMatch(/drop constraint if exists coach_applications_valid_faqs/i);
    expect(sql).toMatch(/add constraint coach_applications_valid_faqs/i);
  });

  it("locks the application row before validating and recording a moderation transition", async () => {
    const sql = await migration();
    const reviewFunction = sql.slice(sql.indexOf("create or replace function public.review_coach_application"));
    expect(reviewFunction).toMatch(/select status into previous_status[\s\S]*where user_id = target_user_id[\s\S]*for update;/i);
    expect(reviewFunction.indexOf("for update;")).toBeLessThan(reviewFunction.indexOf("update public.coach_applications"));
    expect(reviewFunction).toMatch(/insert into public\.coach_moderation_events/i);
  });
});
