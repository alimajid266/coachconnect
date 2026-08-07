import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const profile = readFileSync("src/app/coaches/[id]/page.tsx", "utf8");
const workspace = readFileSync("src/components/member-workspace.tsx", "utf8");

describe("reported interface regressions", () => {
  it("keeps the arrow cursor on page copy while preserving text cursors for form fields", () => {
    expect(css).toMatch(/body\s*\{[^}]*cursor:\s*default/);
    expect(css).toMatch(/input\[type="text"\][^\{]*\{[^}]*cursor:\s*text/);
    expect(css).not.toMatch(/input,\s*textarea[^\{]*\{[^}]*cursor:\s*text/);
  });

  it("gives the coach specialty its own spaced line below the name", () => {
    expect(profile).toContain('className="coach-profile-specialty"');
    expect(css).toMatch(/\.coach-profile-specialty\s*\{[^}]*margin-top:\s*(?:1[2-9]|[2-9]\d)px/);
  });

  it("centers full-page member workspace loading states", () => {
    expect(workspace).toMatch(/state === "loading"[^;]*route-loading-screen/);
  });
});
