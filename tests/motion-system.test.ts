import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const css = readFileSync(join(projectRoot, "src/app/globals.css"), "utf8");
const siteHeader = readFileSync(join(projectRoot, "src/components/site-header.tsx"), "utf8");

describe("CoachConnect motion system", () => {
  it("defines shared motion timing and easing tokens", () => {
    expect(css).toContain("--motion-fast:");
    expect(css).toContain("--motion-standard:");
    expect(css).toContain("--motion-slow:");
    expect(css).toContain("--motion-ease-out:");
    expect(css).toContain("--motion-ease-spring:");
  });

  it("coordinates page, imagery, popover and catalog transitions", () => {
    expect(css).toContain("@keyframes cc-rise-fade");
    expect(css).toContain("@keyframes cc-image-reveal");
    expect(css).toContain("@keyframes cc-popover-in");
    expect(css).toContain(".catalog-card:hover .catalog-card-image");
    expect(css).toContain(".search-console:focus-within");
  });

  it("does not hide marketplace content behind experimental scroll timelines", () => {
    expect(css).not.toContain("animation-timeline: view()");
  });

  it("keeps the account popover mounted for smooth exit motion while hiding inactive controls", () => {
    expect(siteHeader).toContain('aria-hidden={!menuOpen}');
    expect(siteHeader).toContain('data-state={menuOpen ? "open" : "closed"}');
    expect(siteHeader).toContain('inert={!menuOpen}');
  });

  it("disables motion for people who request reduced motion", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toContain("animation: none !important");
    expect(css).toContain("transition: none !important");
  });
});
