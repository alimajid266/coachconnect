import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const interests = Array.isArray(body.interests) ? body.interests.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter((value) => value.length >= 2 && value.length <= 40).slice(0, 12) : [];
    const preferredLocation = typeof body.preferredLocation === "string" ? body.preferredLocation.trim().slice(0, 80) : "";
    const trainingGoal = typeof body.trainingGoal === "string" ? body.trainingGoal.trim().slice(0, 240) : "";
    const experienceLevel = ["Beginner", "Intermediate", "Advanced"].includes(String(body.experienceLevel)) ? String(body.experienceLevel) : "Beginner";
    const maxBudgetPkr = Number(body.maxBudgetPkr);
    const role = "ATHLETE" as const;

    if (displayName.length < 2 || displayName.length > 60) throw new Error("Display name must be 2 to 60 characters.");
    if (!email || !email.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 12) throw new Error("Password must be at least 12 characters.");
    if (interests.length === 0) throw new Error("Choose at least one sport or training interest.");
    if (!preferredLocation) throw new Error("Choose your preferred location.");
    if (!Number.isInteger(maxBudgetPkr) || maxBudgetPkr < 500 || maxBudgetPkr > 1_000_000) throw new Error("Enter a session budget between Rs 500 and Rs 1,000,000.");
    if (trainingGoal.length < 2) throw new Error("Describe your main training goal.");


    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role, interests, preferred_location: preferredLocation, max_budget_pkr: maxBudgetPkr, training_goal: trainingGoal, experience_level: experienceLevel },
        emailRedirectTo: new URL("/account", request.url).toString(),
      },
    });

    const duplicateAccount = error?.code === "user_already_exists"
      || error?.message.toLowerCase() === "user already registered";
    if (duplicateAccount) {
      return applyCookies(NextResponse.json(
        { error: "An account already exists for this email. Sign in instead." },
        { status: 409 },
      ));
    }
    if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
    if (!data.user) return applyCookies(NextResponse.json({ error: "Account could not be created." }, { status: 400 }));
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return applyCookies(NextResponse.json(
        { error: "An account already exists for this email. Sign in instead." },
        { status: 409 },
      ));
    }
    if (!data.session) {
      return applyCookies(NextResponse.json({ pendingEmailConfirmation: true }, { status: 202 }));
    }

    return applyCookies(NextResponse.json({
      user: { id: data.user.id, displayName, email: data.user.email ?? email, role },
    }, { status: 201 }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
