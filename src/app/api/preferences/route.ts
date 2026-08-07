import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const sports = new Set(["Football", "Cricket", "Tennis", "Strength", "Swimming", "Badminton", "Boxing", "Yoga", "Running"]);
const levels = new Set(["Beginner", "Intermediate", "Advanced"]);

async function member(request: NextRequest) {
  const client = createSupabaseRouteClient(request);
  const { data } = await client.supabase.auth.getUser();
  return { ...client, user: data.user };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, applyCookies } = await member(request);
    if (!user) return NextResponse.json({ error: "Sign in to manage preferences." }, { status: 401 });
    const { data, error } = await supabase.from("profiles").select("interests, preferred_location, max_budget_pkr, training_goal, experience_level").eq("id", user.id).single();
    if (error) throw error;
    return applyCookies(NextResponse.json({ preferences: { interests: data.interests ?? [], preferredLocation: data.preferred_location ?? "", maxBudgetPkr: data.max_budget_pkr ?? 3000, trainingGoal: data.training_goal ?? "", experienceLevel: data.experience_level ?? "Beginner" } }));
  } catch { return NextResponse.json({ error: "Preferences are temporarily unavailable." }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  const rejection = rejectCrossOriginRequest(request);
  if (rejection) return rejection;
  try {
    const { supabase, user, applyCookies } = await member(request);
    if (!user) return NextResponse.json({ error: "Sign in to manage preferences." }, { status: 401 });
    const body = await request.json();
    const interests = Array.isArray(body.interests) ? [...new Set(body.interests.filter((item: unknown): item is string => typeof item === "string" && sports.has(item)))].slice(0, 8) : [];
    const preferredLocation = typeof body.preferredLocation === "string" ? body.preferredLocation.trim().slice(0, 80) : "";
    const maxBudgetPkr = Number(body.maxBudgetPkr);
    const trainingGoal = typeof body.trainingGoal === "string" ? body.trainingGoal.trim().slice(0, 240) : "";
    const experienceLevel = typeof body.experienceLevel === "string" && levels.has(body.experienceLevel) ? body.experienceLevel : "Beginner";
    if (!interests.length || trainingGoal.length < 2 || !Number.isInteger(maxBudgetPkr) || maxBudgetPkr < 500 || maxBudgetPkr > 1_000_000) return NextResponse.json({ error: "Choose an interest, goal and valid budget." }, { status: 400 });
    const { error } = await supabase.from("profiles").update({ interests, preferred_location: preferredLocation || null, max_budget_pkr: maxBudgetPkr, training_goal: trainingGoal, experience_level: experienceLevel }).eq("id", user.id);
    if (error) throw error;
    return applyCookies(NextResponse.json({ message: "Recommendation preferences saved." }));
  } catch { return NextResponse.json({ error: "Preferences could not be saved." }, { status: 503 }); }
}
