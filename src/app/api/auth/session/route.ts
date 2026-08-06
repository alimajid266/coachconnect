import { NextRequest, NextResponse } from "next/server";
import { isMissingAuthSessionError } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && !isMissingAuthSessionError(authError)) {
      return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    }
    if (!authData.user) {
      return applyCookies(NextResponse.json({ user: null }));
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      return applyCookies(NextResponse.json({ error: "Account profile is unavailable." }, { status: 503 }));
    }

    const { data: coachApplication, error: coachApplicationError } = await supabase
      .from("coach_applications")
      .select("status")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (coachApplicationError) {
      return applyCookies(NextResponse.json({ error: "Coach status is unavailable." }, { status: 503 }));
    }
    const coachStatus = coachApplication?.status ?? (profile.role === "COACH" ? "APPROVED" : null);

    return applyCookies(NextResponse.json({
      user: {
        id: authData.user.id,
        displayName: profile.display_name,
        email: authData.user.email ?? "",
        role: profile.role,
        capabilities: {
          administrator: profile.role === "ADMIN",
          coachStatus,
        },
      },
    }));
  } catch {
    return NextResponse.json({ error: "Account status is unavailable." }, { status: 503 });
  }
}
