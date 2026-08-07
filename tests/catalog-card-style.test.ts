import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("coach catalog card sizing", () => {
  it("stretches every card and anchors its footer action", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/\.catalog-card\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*height:\s*100%/);
    expect(css).toMatch(/\.catalog-card-body\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*flex:\s*1/);
    expect(css).toMatch(/\.catalog-card-footer\s*\{[^}]*margin-top:\s*auto/);
  });
});
