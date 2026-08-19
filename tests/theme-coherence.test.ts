import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

describe("CoachConnect color system", () => {
  it("uses a homepage-scoped crimson palette without changing the global product palette", () => {
    expect(css).toMatch(/:root\s*\{[\s\S]*?--sport-blue:\s*#2563eb;/i);
    expect(css).toMatch(/\.revived-home\s*\{[\s\S]*?--sport-blue:\s*#dc2626;[\s\S]*?--coral:\s*#dc2626;/i);
    expect(css).toMatch(/\.revived-home \.site-header[^}]*rgba\(127,\s*29,\s*29/i);
    expect(css).not.toMatch(/#e96357|rgba\(255\s*,\s*107\s*,\s*87/i);
    expect(css).not.toMatch(/#294a41/i);
  });
});
