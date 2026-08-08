import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { coaches, demoCatalogDetailsByCoach } from "@/lib/coaches";

const path = "supabase/migrations/20260806123000_curated_demo_coaches.sql";
const expansionPath = "supabase/migrations/20260808020000_expand_curated_demo_coaches.sql";

async function sql() {
  return readFile(path, "utf8");
}

function splitSqlRow(row: string) {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  let bracketDepth = 0;
  for (let index = 1; index < row.length - 1; index += 1) {
    const character = row[index];
    if (character === "'" && quoted && row[index + 1] === "'") {
      current += "''";
      index += 1;
    } else if (character === "'") {
      quoted = !quoted;
      current += character;
    } else if (!quoted && character === "[") {
      bracketDepth += 1;
      current += character;
    } else if (!quoted && character === "]") {
      bracketDepth -= 1;
      current += character;
    } else if (!quoted && bracketDepth === 0 && character === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  fields.push(current.trim());
  return fields;
}

function sqlStrings(value: string) {
  return Array.from(value.matchAll(/'((?:''|[^'])*)'/g), (match) => match[1].replace(/''/g, "'"));
}

describe("curated demo coach migration", () => {
  it("stores exactly fifteen durable demo profiles without fake identity or review data", async () => {
    const migration = await sql();
    expect(migration).toMatch(/create table if not exists public\.curated_demo_coaches/i);
    const rows = migration.match(/-- demo-coach-row/g) ?? [];
    expect(rows).toHaveLength(15);
    expect(migration).not.toMatch(/email|rating|review_count|lesson_count/i);
  });

  it("adds fifteen distinct demo-safe profiles for a thirty-profile durable catalog", async () => {
    const original = await sql();
    const expansion = await readFile(expansionPath, "utf8");
    expect(original.match(/-- demo-coach-row/g) ?? []).toHaveLength(15);
    expect(expansion.match(/-- demo-coach-row/g) ?? []).toHaveLength(15);
    expect(expansion).not.toMatch(/\bemail\b|\brating\b|review_count|lesson_count/i);
  });

  it("keeps every built-in fallback profile aligned with its durable catalog row", () => {
    expect(coaches.slice(0, 15).map((coach) => [coach.id, coach.sports, coach.location, coach.price, coach.mode, coach.availability])).toEqual([
      ["ayesha-khan", ["Cricket"], "Lahore", 3500, "In person", ["Saturday", "Sunday"]],
      ["hamza-siddiqui", ["Tennis", "Badminton"], "Karachi", 4200, "In person", ["Friday", "Saturday"]],
      ["sara-ahmed", ["Yoga"], "Online", 2500, "Online", ["Monday", "Wednesday", "Sunday"]],
      ["zainab-malik", ["Swimming"], "Lahore", 4000, "In person", ["Tuesday", "Thursday", "Saturday"]],
      ["omar-farooq", ["Strength"], "Online", 2800, "Online", ["Monday", "Thursday", "Saturday"]],
      ["bilal-raza", ["Football"], "Lahore", 3800, "In person", ["Friday", "Saturday", "Sunday"]],
      ["danish-iqbal", ["Boxing"], "Karachi", 3600, "In person", ["Tuesday", "Thursday", "Sunday"]],
      ["hira-noor", ["Badminton"], "Lahore", 3000, "In person", ["Wednesday", "Saturday"]],
      ["farhan-akram", ["Running"], "Islamabad", 4500, "In person + Online", ["Tuesday", "Friday", "Sunday"]],
      ["mariam-shah", ["Basketball"], "Karachi", 3400, "In person", ["Friday", "Saturday"]],
      ["usman-tariq", ["Table Tennis"], "Lahore", 3200, "In person", ["Monday", "Thursday", "Saturday"]],
      ["nadia-hussain", ["Yoga", "Strength"], "Online", 2200, "Online", ["Monday", "Wednesday", "Friday"]],
      ["rida-aslam", ["Cricket"], "Online", 2700, "Online", ["Tuesday", "Thursday", "Sunday"]],
      ["sameer-qureshi", ["Football", "Strength"], "Karachi", 3900, "In person", ["Wednesday", "Friday", "Sunday"]],
      ["iqra-javed", ["Tennis"], "Islamabad", 3100, "In person", ["Friday", "Saturday", "Sunday"]],
    ]);
  });

  it("keeps filter-driving fallback details aligned with all thirty durable rows", async () => {
    const migrations = `${await sql()}\n${await readFile(expansionPath, "utf8")}`;
    const durableDetails = Object.fromEntries(migrations.split("\n").map((line) => line.trim())
      .filter((line) => line.startsWith("('")).map((line) => {
        const normalizedRow = line.replace(/,$/, "");
        const fields = splitSqlRow(normalizedRow);
        const id = sqlStrings(fields[0])[0];
        return [id, {
          tags: sqlStrings(fields[5]),
          audiences: sqlStrings(fields[15]),
          levels: sqlStrings(fields[16]),
          languages: (sqlStrings(fields[19])[0] ?? "").split("|").filter(Boolean),
        }];
      }));

    expect(Object.keys(durableDetails)).toHaveLength(30);
    expect(demoCatalogDetailsByCoach).toEqual(durableDetails);
    expect(coaches.every((coach) => (
      coach.tags.join("|") === durableDetails[coach.id].tags.join("|")
      && coach.audiences.join("|") === durableDetails[coach.id].audiences.join("|")
      && coach.levels.join("|") === durableDetails[coach.id].levels.join("|")
      && coach.languages.join("|") === durableDetails[coach.id].languages.join("|")
    ))).toBe(true);
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
