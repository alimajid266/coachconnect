import { describe, expect, it, vi } from "vitest";
import { generateTrainingPlan } from "@/lib/training-plan";

const input = { sport: "Badminton", goal: "Improve footwork", level: "Beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: "Racket and shuttlecocks" };

describe("training plan generation", () => {
  it("returns a bounded deterministic plan when every free model is unavailable", async () => {
    const fetcher = vi.fn(async () => new Response("capacity", { status: 429 }));
    const result = await generateTrainingPlan(input, "test-key", fetcher);
    expect(result.generatedBy).toBe("CoachConnect fallback");
    expect(result.plan.sessions).toHaveLength(3);
    expect(result.plan.sessions.every((session) => session.minutes === 45)).toBe(true);
    expect(result.plan.safetyNote).toMatch(/stop.*pain|pain.*stop/i);
  });

  it("rejects unsafe or malformed model output in favor of the deterministic plan", async () => {
    const fetcher = vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ title: "Diagnosis and rehabilitation", sessions: [] }) } }], model: "free-model" }));
    const result = await generateTrainingPlan(input, "test-key", fetcher);
    expect(result.generatedBy).toBe("CoachConnect fallback");
    expect(result.plan.sessions).toHaveLength(3);
  });
});
