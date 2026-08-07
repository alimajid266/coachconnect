import { describe, expect, it, vi } from "vitest";
import { generateTrainingPlan } from "@/lib/training-plan";

const input = { sport: "Badminton", goal: "Improve footwork", level: "Beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: "Racket and shuttlecocks" };

describe("training plan generation", () => {
  it("returns a bounded deterministic plan when Gemini is unavailable", async () => {
    const fetcher = vi.fn(async () => new Response("capacity", { status: 429 }));
    const result = await generateTrainingPlan(input, "test-key", fetcher);
    expect(result.generatedBy).toBe("CoachConnect fallback");
    expect(result.plan.sessions).toHaveLength(3);
    expect(result.plan.sessions.every((session) => session.minutes === 45)).toBe(true);
    expect(result.plan.safetyNote).toMatch(/stop.*pain|pain.*stop/i);
  });

  it("rejects unsafe or malformed model output in favor of the deterministic plan", async () => {
    const fetcher = vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "Diagnosis and rehabilitation", sessions: [] }) }] } }] }));
    const result = await generateTrainingPlan(input, "test-key", fetcher);
    expect(result.generatedBy).toBe("CoachConnect fallback");
    expect(result.plan.sessions).toHaveLength(3);
  });

  it("accepts a valid structured plan from Gemini 3.5 Flash-Lite", async () => {
    const plan = {
      title: "Badminton footwork foundations",
      summary: "Three safe beginner sessions focused on efficient court movement.",
      safetyNote: "Stop if you feel pain, dizziness, or unusual shortness of breath.",
      sessions: ["Monday", "Wednesday", "Saturday"].map((day) => ({
        day,
        focus: "Balanced court movement",
        warmup: ["Five minutes of easy movement"],
        workout: ["Shadow six court positions with full recovery"],
        cooldown: ["Walk slowly and stretch gently"],
        minutes: 45,
      })),
    };
    const fetcher = vi.fn(async () => Response.json({
      modelVersion: "gemini-3.5-flash-lite",
      candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] } }],
    }));

    const result = await generateTrainingPlan(input, "test-key", fetcher);

    expect(result.generatedBy).toBe("Gemini 3.5 Flash-Lite");
    expect(result.plan).toMatchObject({ title: plan.title, sessions: plan.sessions });
    expect(fetcher).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-goog-api-key": "test-key" }),
      }),
    );
  });
});
