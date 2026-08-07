import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260806163000_approved_coach_live_edits.sql", "utf8");
const catalogMigration = readFileSync("supabase/migrations/20260806050000_public_coach_catalog.sql", "utf8");

describe("approved coach live edits migration", () => {
  it("removes only the automatic re-review trigger", () => {
    expect(catalogMigration).toMatch(/create trigger coach_applications_require_review_after_edit/i);
    expect(migration).toMatch(/drop trigger if exists coach_applications_require_review_after_edit/i);
    expect(migration).toMatch(/drop function if exists public\.require_review_after_approved_coach_edit\(\)/i);
    expect(migration).not.toMatch(/create trigger/i);
  });

  it("retains the initial moderation and suspension model", () => {
    expect(catalogMigration).toMatch(/where user_id = \(select auth\.uid\(\)\)\s+and status in \('DRAFT', 'REJECTED'\)/i);
    expect(catalogMigration).toMatch(/to_status[\s\S]*SUSPENDED/i);
    expect(migration).not.toMatch(/grant/i);
    expect(migration).not.toMatch(/disable row level security/i);
  });
});
