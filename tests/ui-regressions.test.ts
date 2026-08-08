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

  it("uses wide responsive shells instead of leaving large unused desktop margins", () => {
    expect(css).toMatch(/\.container\s*\{[^}]*width:\s*min\(2400px,\s*calc\(100%\s*-\s*clamp\(24px,\s*4vw,\s*80px\)\)\)/);
    expect(css).toMatch(/\.member-account-main\s*\{[^}]*width:\s*min\(2400px,\s*calc\(100%\s*-\s*clamp\(24px,\s*4vw,\s*80px\)\)\)/);
    expect(css).toMatch(/\.coach-profile-main\s*\{[^}]*width:\s*min\(2400px,\s*calc\(100%\s*-\s*clamp\(24px,\s*4vw,\s*80px\)\)\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*1100px\)\s*\{[\s\S]*?\.coach-earnings-summary\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  });

  it("gives the coach specialty its own spaced line below the name", () => {
    expect(profile).toContain('className="coach-profile-specialty"');
    expect(css).toMatch(/\.coach-profile-specialty\s*\{[^}]*margin-top:\s*(?:1[2-9]|[2-9]\d)px/);
  });

  it("centers full-page member workspace loading states", () => {
    expect(workspace).toMatch(/state === "loading"[^;]*route-loading-screen/);
  });
});
