import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("health endpoint", () => {
  it("reports that CoachConnect is ready", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: "coachconnect",
      status: "ok",
    });
  });
});
