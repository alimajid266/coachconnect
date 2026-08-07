import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { runGeminiDiscovery, type GeminiCatalogCoach } from "@/lib/gemini-discovery";

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function textList(value: unknown, limit: number) {
  return Array.isArray(value) ? value.map((entry) => text(entry, 80)).filter(Boolean).slice(0, limit) : [];
}

function catalog(value: unknown): GeminiCatalogCoach[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error("invalid catalog");
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = text(row.user_id, 80);
    const name = text(row.display_name, 100);
    const sports = textList(row.sports, 8);
    const price = typeof row.session_price_pkr === "number" && Number.isFinite(row.session_price_pkr)
      ? Math.round(row.session_price_pkr) : 0;
    if (!id || !name || sports.length === 0 || price <= 0 || price > 1_000_000) return [];
    return [{
      id,
      name,
      sports,
      price,
      tags: textList(row.tags, 12),
      city: text(row.city, 80),
      modes: [row.offers_online === true ? "Online" : "", row.offers_in_person === true ? "In person" : ""].filter(Boolean),
      levels: textList(row.levels, 5),
      availability: textList(row.availability, 7),
      headline: text(row.headline, 140),
    }];
  });
}

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send AI searches as JSON." }, { status: 415 });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI search is not configured yet." }, { status: 503 });
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return applyCookies(NextResponse.json({ error: "Sign in to use AI search. Standard search still works." }, { status: 401 }));
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4_000) {
      return applyCookies(NextResponse.json({ error: "The AI search request is too large." }, { status: 413 }));
    }
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const query = text(body.query, 500);
    if (query.length < 2) return NextResponse.json({ error: "Describe what you need from a coach." }, { status: 400 });
    const quota = await supabase.rpc("consume_ai_discovery_quota");
    if (quota.error) return applyCookies(NextResponse.json({ error: "AI search is temporarily unavailable. Standard search still works." }, { status: 503 }));
    if (quota.data !== true) return applyCookies(NextResponse.json({ error: "AI search limit reached for this hour. Standard search still works." }, { status: 429 }));
    const [{ data, error }, { data: profile }] = await Promise.all([
      supabase.rpc("list_public_coaches"),
      supabase.from("profiles").select("interests, preferred_location, max_budget_pkr, training_goal, experience_level").eq("id", authData.user.id).single(),
    ]);
    if (error) return NextResponse.json({ error: "Approved coaches are temporarily unavailable." }, { status: 503 });
    const coaches = catalog(data);
    if (coaches.length === 0) return NextResponse.json({ error: "No approved coaches are currently available to rank." }, { status: 400 });

    const result = await runGeminiDiscovery(query, coaches, apiKey, fetch, {
      interests: Array.isArray(profile?.interests) ? profile.interests : [],
      location: profile?.preferred_location ?? undefined,
      maxBudgetPkr: typeof profile?.max_budget_pkr === "number" ? profile.max_budget_pkr : undefined,
      goal: profile?.training_goal ?? undefined,
      level: profile?.experience_level ?? undefined,
    });
    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("Gemini coach discovery failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "AI search is temporarily unavailable. Standard search still works." }, { status: 502 });
  }
}
