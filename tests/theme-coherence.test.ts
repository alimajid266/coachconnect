import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

describe("CoachConnect color system", () => {
  it("uses blue and ink accents instead of the legacy coral and green primary colors", () => {
    expect(css).toMatch(/\.revived-home\s*\{[\s\S]*?--coral:\s*#60a5fa;/i);
    expect(css).not.toMatch(/#e96357|rgba\(255\s*,\s*107\s*,\s*87/i);
    expect(css).not.toMatch(/#294a41/i);
  });
});
