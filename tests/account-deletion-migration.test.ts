import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260805190000_self_service_account_deletion.sql",
);

describe("self-service account deletion migration", () => {
  it("allows only an authenticated member to delete their own auth identity", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/create function public\.delete_my_account\(\)/i);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/account_id\s+uuid\s*:=\s*\(select auth\.uid\(\)\)/i);
    expect(sql).toMatch(/if account_id is null then/i);
    expect(sql).toMatch(/delete from auth\.users\s+where id = account_id/i);
    expect(sql).toMatch(/revoke all on function public\.delete_my_account\(\) from public/i);
    expect(sql).toMatch(/revoke all on function public\.delete_my_account\(\) from anon/i);
    expect(sql).toMatch(/grant execute on function public\.delete_my_account\(\) to authenticated/i);
    expect(sql).not.toMatch(/service_role/i);
  });
});
