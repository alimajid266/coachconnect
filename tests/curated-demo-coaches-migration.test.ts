import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/20260806123000_curated_demo_coaches.sql";

async function sql() {
  return readFile(path, "utf8");
}

describe("curated demo coach migration", () => {
  it("stores exactly fifteen durable demo profiles without fake identity or review data", async () => {
    const migration = await sql();
    expect(migration).toMatch(/create table if not exists public\.curated_demo_coaches/i);
    const rows = migration.match(/-- demo-coach-row/g) ?? [];
    expect(rows).toHaveLength(15);
    expect(migration).not.toMatch(/email|rating|review_count|lesson_count/i);
  });

  it("keeps demo rows in a separate explicitly labeled public projection", async () => {
    const migration = await sql();
    const fn = migration.match(/create or replace function public\.list_demo_coaches\(\)([\s\S]*?)\n\$\$;/i)?.[1] ?? "";
    expect(fn).not.toBe("");
    expect(fn).toMatch(/from public\.curated_demo_coaches demo/i);
    expect(fn).toMatch(/demo\.is_active = true/i);
    expect(fn).toMatch(/true as is_demo/i);
    expect(fn).not.toMatch(/coach_applications|review_note|reviewed_by|email/i);
    expect(migration).not.toMatch(/list_catalog_coaches/i);
  });

  it("provides a demo-only projection for direct demo profile navigation", async () => {
    const migration = await sql();
    expect(migration).toMatch(/create or replace function public\.get_public_demo_coach\(target_profile_id text\)/i);
    expect(migration).toMatch(/revoke all on function public\.get_public_demo_coach/i);
    expect(migration).toMatch(/grant execute on function public\.get_public_demo_coach/i);
  });
});
