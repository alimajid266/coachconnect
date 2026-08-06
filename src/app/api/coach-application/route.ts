import { NextRequest, NextResponse } from "next/server";
import { isMissingAuthSessionError, rejectCrossOriginRequest } from "@/lib/auth-http";
import { normalizeCoachApplicationDraft, serializeCoachApplication } from "@/lib/coach-application";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && !isMissingAuthSessionError(authError)) {
      return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    }
    if (!authData.user) {
      return applyCookies(NextResponse.json({ error: "Sign in to manage a coach application." }, { status: 401 }));
    }

    const { data, error } = await supabase
      .from("coach_applications")
      .select("*")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (error) {
      return applyCookies(NextResponse.json({ error: "Coach applications are temporarily unavailable." }, { status: 503 }));
    }
    return applyCookies(NextResponse.json({ application: serializeCoachApplication(data) }));
  } catch {
    return NextResponse.json({ error: "Coach applications are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && !isMissingAuthSessionError(authError)) {
      return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    }
    if (!authData.user) {
      return applyCookies(NextResponse.json({ error: "Sign in to submit a coach application." }, { status: 401 }));
    }

    const { data, error } = await supabase.rpc("submit_coach_application");
    if (error) {
      const message = error.message.includes("Complete every required")
        ? "Complete every required profile field before submitting."
        : "The coach application could not be submitted.";
      return applyCookies(NextResponse.json({ error: message }, { status: 400 }));
    }
    return applyCookies(NextResponse.json({ application: serializeCoachApplication(data) }));
  } catch {
    return NextResponse.json({ error: "The coach application could not be submitted." }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const draft = normalizeCoachApplicationDraft(body);
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && !isMissingAuthSessionError(authError)) {
      return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    }
    if (!authData.user) {
      return applyCookies(NextResponse.json({ error: "Sign in to save a coach application." }, { status: 401 }));
    }
    if (draft.profile_image_path && !draft.profile_image_path.startsWith(`${authData.user.id}/`)) {
      return applyCookies(NextResponse.json({ error: "The profile image must belong to your account." }, { status: 400 }));
    }

    const { data, error } = await supabase
      .from("coach_applications")
      .upsert({ user_id: authData.user.id, ...draft }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) {
      return applyCookies(NextResponse.json({ error: "The coach application could not be saved." }, { status: 400 }));
    }
    return applyCookies(NextResponse.json({ application: serializeCoachApplication(data) }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The coach application could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
