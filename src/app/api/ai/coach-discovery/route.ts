import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
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

const limits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(request: NextRequest) {
  const identity = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const key = createHash("sha256").update(identity).digest("hex").slice(0, 20);
  const now = Date.now();
  const current = limits.get(key);
  if (!current || current.resetAt <= now) {
    limits.set(key, { count: 1, resetAt: now + 60_000 });
    if (limits.size > 1000) {
      for (const [entry, value] of limits) if (value.resetAt <= now) limits.delete(entry);
    }
    return false;
  }
  current.count += 1;
  return current.count > 10;
}

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  if (rateLimited(request)) {
    return NextResponse.json({ error: "Too many AI searches. Standard search still works." }, { status: 429 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_000) return NextResponse.json({ error: "The AI search request is too large." }, { status: 413 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI search is not configured yet." }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const query = text(body.query, 500);
    if (query.length < 2) return NextResponse.json({ error: "Describe what you need from a coach." }, { status: 400 });

    const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      return NextResponse.json({ error: "Approved coaches are temporarily unavailable." }, { status: 503 });
    }
    const supabase = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase.rpc("list_public_coaches");
    if (error) return NextResponse.json({ error: "Approved coaches are temporarily unavailable." }, { status: 503 });
    const coaches = catalog(data);
    if (coaches.length === 0) return NextResponse.json({ error: "No approved coaches are currently available to rank." }, { status: 400 });

    const result = await runGeminiDiscovery(query, coaches, apiKey);
    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch {
    return NextResponse.json({ error: "AI search is temporarily unavailable. Standard search still works." }, { status: 502 });
  }
}
