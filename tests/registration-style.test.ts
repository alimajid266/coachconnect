import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("registration interest styling", () => {
  it("renders suggested sports as compact selectable chips instead of full-size text inputs", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain('.auth-preferences input[type="checkbox"]');
    expect(css).toMatch(/\.auth-preferences input\[type="checkbox"\][^{]*\{[^}]*width:\s*auto/);
    expect(css).toContain(".auth-preferences > div:first-of-type");
  });
});
