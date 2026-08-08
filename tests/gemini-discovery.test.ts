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

  it("rotates equal-score AI results instead of preserving approved-first source order", async () => {
    vi.useFakeTimers();
    try {
      const tiedCoaches = [
        { ...coaches[0], id: "ali-majid2", name: "Ali Majid2" },
        { ...coaches[0], id: "coach-2", name: "Coach Two" },
        { ...coaches[0], id: "coach-3", name: "Coach Three" },
        { ...coaches[0], id: "coach-4", name: "Coach Four" },
      ];
      const firstIds: string[] = [];
      for (const day of ["2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11"]) {
        vi.setSystemTime(new Date(`${day}T12:00:00Z`));
        const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
          modelVersion: "gemini-3.5-flash-lite",
          candidates: [{ content: { parts: [{ text: JSON.stringify({ sport: null, city: null, level: null, format: null, affordability: false, maxPrice: null, day: null, tags: [], keywords: [] }) }] } }],
        }), { status: 200 }));
        const result = await runGeminiDiscovery("find a coach", tiedCoaches, "secret", fetcher);
        firstIds.push(result.recommendations[0].id);
      }
      expect(new Set(firstIds)).toEqual(new Set(tiedCoaches.map((coach) => coach.id)));
    } finally {
      vi.useRealTimers();
    }
  });

  it("rotates fairly within an AI score subgroup", async () => {
    vi.useFakeTimers();
    try {
      const mixedCoaches = [
        { ...coaches[0], id: "ali-majid2", name: "Ali Majid2", city: "Lahore" },
        { ...coaches[0], id: "lower-a", name: "Lower A", city: "Karachi" },
        { ...coaches[0], id: "tied-peer", name: "Tied Peer", city: "Lahore" },
        { ...coaches[0], id: "lower-b", name: "Lower B", city: "Islamabad" },
      ];
      const firstIds: string[] = [];
      for (const day of ["2026-08-08", "2026-08-09"]) {
        vi.setSystemTime(new Date(`${day}T12:00:00Z`));
        const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
          modelVersion: "gemini-3.5-flash-lite",
          candidates: [{ content: { parts: [{ text: JSON.stringify({ sport: null, city: "Lahore", level: null, format: null, affordability: false, maxPrice: null, day: null, tags: [], keywords: [] }) }] } }],
        }), { status: 200 }));
        const result = await runGeminiDiscovery("coach in Lahore", mixedCoaches, "secret", fetcher);
        firstIds.push(result.recommendations[0].id);
      }
      expect(new Set(firstIds)).toEqual(new Set(["ali-majid2", "tied-peer"]));
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses one grounded Gemini interpretation call and deterministic catalog ranking", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ modelVersion: "gemini-3.5-flash-lite", candidates: [{ content: { parts: [{ text: JSON.stringify({ sport: "Cricket", city: "Lahore", level: "Beginner", format: "In person", affordability: true, maxPrice: 3500, day: "Saturday", tags: ["Batting"], keywords: [] }) }] } }] }), { status: 200 }));

    const result = await runGeminiDiscovery("beginner cricket in Lahore under 3500", coaches, "secret", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls.every(([url]) => String(url) === "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent")).toBe(true);
    expect(fetcher.mock.calls.every(([, init]) => new Headers(init?.headers).get("x-goog-api-key") === "secret")).toBe(true);
    expect(fetcher.mock.calls.every(([, init]) => {
      const body = JSON.parse(String(init?.body));
      return body.generationConfig.responseMimeType === "application/json" && body.generationConfig.responseJsonSchema;
    })).toBe(true);
    expect(result.interpretation.filters).toMatchObject({ sport: "Cricket", city: "Lahore", maxPrice: 3500 });
    expect(result.recommendations).toEqual([{ id: "coach-1", reasons: expect.arrayContaining(["Offers Cricket coaching", "Based in Lahore"]) }]);
    expect(result.model).toBe("Gemini 3.5 Flash-Lite + deterministic ranking");
  });
});
