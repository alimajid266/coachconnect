import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { generateTrainingPlan } from "@/lib/training-plan";

function shortText(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createSupabaseRouteClient(request);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return applyCookies(NextResponse.json({ error: "Sign in to view training plans." }, { status: 401 }));
  const { data, error } = await supabase.from("training_plans").select("id, sport, goal, level, sessions_per_week, plan, generated_by, created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(6);
  if (error) return applyCookies(NextResponse.json({ error: "Training plans are temporarily unavailable." }, { status: 503 }));
  return applyCookies(NextResponse.json({ plans: data ?? [] }));
}

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI training plans are not configured yet." }, { status: 503 });
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return applyCookies(NextResponse.json({ error: "Sign in to generate a training plan." }, { status: 401 }));
    const body = await request.json() as Record<string, unknown>;
    const sport = shortText(body.sport, 40);
    const goal = shortText(body.goal, 240);
    const level = ["Beginner", "Intermediate", "Advanced"].includes(String(body.level)) ? String(body.level) : "Beginner";
    const sessionsPerWeek = Number(body.sessionsPerWeek);
    const minutesPerSession = Number(body.minutesPerSession);
    const equipment = shortText(body.equipment, 240) || "No special equipment";
    if (sport.length < 2 || goal.length < 2 || !Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7 || ![30, 45, 60, 75, 90].includes(minutesPerSession)) return applyCookies(NextResponse.json({ error: "Choose a sport, goal, 1–7 weekly sessions and a valid session length." }, { status: 400 }));
    const quota = await supabase.rpc("consume_ai_training_plan_quota");
    if (quota.error || quota.data !== true) return applyCookies(NextResponse.json({ error: "Training plan limit reached. Try again later." }, { status: 429 }));
    const generated = await generateTrainingPlan({ sport, goal, level, sessionsPerWeek, minutesPerSession, equipment }, apiKey);
    const { data, error } = await supabase.from("training_plans").insert({ user_id: auth.user.id, sport, goal, level, sessions_per_week: sessionsPerWeek, plan: generated.plan, generated_by: generated.generatedBy }).select("id, sport, goal, level, sessions_per_week, plan, generated_by, created_at").single();
    if (error || !data) return applyCookies(NextResponse.json({ error: "The plan was generated but could not be saved." }, { status: 503 }));
    return applyCookies(NextResponse.json({ plan: data.plan, generatedBy: data.generated_by, id: data.id, createdAt: data.created_at }, { status: 201 }));
  } catch {
    return NextResponse.json({ error: "The training plan could not be generated." }, { status: 502 });
  }
}
