import { describe, expect, it, vi } from "vitest";
import { runGeminiDiscovery } from "@/lib/gemini-discovery";

const coaches = [
  { id: "coach-1", name: "Ayesha", sports: ["Cricket"], tags: ["Batting"], city: "Lahore", modes: ["In person"], price: 3000, levels: ["Beginner"], availability: ["Saturday"], headline: "Patient batting coach" },
];

describe("Gemini coach discovery", () => {
  it("does not show deterministic city-conflict warnings after AI interprets the request", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ modelVersion: "gemini-3.5-flash-lite", candidates: [{ content: { parts: [{ text: JSON.stringify({ sport: "Cricket", city: null, level: null, format: null, affordability: false, maxPrice: null, day: null, tags: [], keywords: [] }) }] } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ modelVersion: "gemini-3.5-flash-lite", candidates: [{ content: { parts: [{ text: JSON.stringify({ recommendations: [{ id: "coach-1", reasons: ["Matches cricket coaching"] }] }) }] } }] }), { status: 200 }));

    const result = await runGeminiDiscovery("cricket coach in Lahore or Islamabad", coaches, "secret", fetcher);

    expect(result.interpretation.conflicts).toEqual([]);
  });

  it("uses Gemini 3.5 Flash-Lite for both grounded search and recommendations", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ modelVersion: "gemini-3.5-flash-lite", candidates: [{ content: { parts: [{ text: JSON.stringify({ sport: "Cricket", city: "Lahore", level: "Beginner", format: "In person", affordability: true, maxPrice: 3500, day: "Saturday", tags: ["Batting"], keywords: [] }) }] } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ modelVersion: "gemini-3.5-flash-lite", candidates: [{ content: { parts: [{ text: JSON.stringify({ recommendations: [{ id: "coach-1", reasons: ["Cricket coach in Lahore"] }, { id: "invented", reasons: ["Made up"] }] }) }] } }] }), { status: 200 }));

    const result = await runGeminiDiscovery("beginner cricket in Lahore under 3500", coaches, "secret", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([url]) => String(url) === "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent")).toBe(true);
    expect(fetcher.mock.calls.every(([, init]) => new Headers(init?.headers).get("x-goog-api-key") === "secret")).toBe(true);
    expect(fetcher.mock.calls.every(([, init]) => {
      const body = JSON.parse(String(init?.body));
      return body.generationConfig.responseMimeType === "application/json" && body.generationConfig.responseJsonSchema;
    })).toBe(true);
    expect(result.interpretation.filters).toMatchObject({ sport: "Cricket", city: "Lahore", maxPrice: 3500 });
    expect(result.recommendations).toEqual([{ id: "coach-1", reasons: ["Cricket coach in Lahore"] }]);
    expect(result.model).toBe("Gemini 3.5 Flash-Lite");
  });
});
