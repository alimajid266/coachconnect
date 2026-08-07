import { describe, expect, it, vi } from "vitest";
import { runGeminiDiscovery } from "@/lib/gemini-discovery";

const coaches = [
  { id: "coach-1", name: "Ayesha", sports: ["Cricket"], tags: ["Batting"], city: "Lahore", modes: ["In person"], price: 3000, levels: ["Beginner"], availability: ["Saturday"], headline: "Patient batting coach" },
];

describe("OpenRouter coach discovery", () => {
  it("uses free OpenRouter models for both grounded search and recommendations", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ model: "google/gemma-4-26b-a4b-it:free", choices: [{ message: { content: JSON.stringify({ sport: "Cricket", city: "Lahore", level: "Beginner", format: "In person", affordability: true, maxPrice: 3500, day: "Saturday", tags: ["Batting"], keywords: [] }) } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ model: "google/gemma-4-26b-a4b-it:free", choices: [{ message: { content: JSON.stringify({ recommendations: [{ id: "coach-1", reasons: ["Cricket coach in Lahore"] }, { id: "invented", reasons: ["Made up"] }] }) } }] }), { status: 200 }));

    const result = await runGeminiDiscovery("beginner cricket in Lahore under 3500", coaches, "secret", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([url]) => String(url) === "https://openrouter.ai/api/v1/chat/completions")).toBe(true);
    expect(fetcher.mock.calls.every(([, init]) => JSON.parse(String(init?.body)).model.endsWith(":free"))).toBe(true);
    expect(result.interpretation.filters).toMatchObject({ sport: "Cricket", city: "Lahore", maxPrice: 3500 });
    expect(result.recommendations).toEqual([{ id: "coach-1", reasons: ["Cricket coach in Lahore"] }]);
  });
});
