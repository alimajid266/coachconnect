import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(tsx|ts)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("user-facing copy", () => {
  it("does not use em dashes", () => {
    const offenders = sourceFiles(path.join(process.cwd(), "src"))
      .filter((file) => fs.readFileSync(file, "utf8").includes("—"));

    expect(offenders).toEqual([]);
  });

  it("does not claim a prebuilt image can receive a Next.js public token at runtime", () => {
    const readme = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf8");
    const publishedImageSection = readme.split("### Run the published image on Ubuntu")[1]
      .split("### Build from source with Compose")[0];
    const sourceBuildSection = readme.split("### Build from source with Compose")[1]
      .split("### When the Docker image must be updated")[0];

    expect(publishedImageSection).not.toContain("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN");
    expect(publishedImageSection).toMatch(/Mapbox view is unavailable[\s\S]*Build from source/i);
    expect(sourceBuildSection).toContain("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN");
    expect(sourceBuildSection).toMatch(/embedded[\s\S]*build/i);
  });
});
