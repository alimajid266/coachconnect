import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type AccountRole = "ATHLETE" | "COACH";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role as AccountRole;

    if (displayName.length < 2 || displayName.length > 60) throw new Error("Display name must be 2 to 60 characters.");
    if (!email || !email.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 12) throw new Error("Password must be at least 12 characters.");
    if (role !== "ATHLETE" && role !== "COACH") throw new Error("Choose athlete or coach.");

    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role },
        emailRedirectTo: new URL("/account", request.url).toString(),
      },
    });

    if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
    if (!data.user) return applyCookies(NextResponse.json({ error: "Account could not be created." }, { status: 400 }));
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
