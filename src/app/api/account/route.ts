import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest, requestIsHttps } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

function expireSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (!name.startsWith("sb-") || !name.includes("auth-token")) continue;
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: requestIsHttps(request),
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

export async function DELETE(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 200) {
      return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
    }

    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return applyCookies(NextResponse.json({ error: "Sign in before deleting your account." }, { status: 401 }));
    }

    if (!authData.user.email) {
      return applyCookies(NextResponse.json({ error: "This account cannot be password-verified." }, { status: 400 }));
    }

    const { data: verified, error: verificationError } = await supabase.auth.signInWithPassword({
      email: authData.user.email,
      password: body.password,
    });
    if (verificationError || verified.user?.id !== authData.user.id) {
      return applyCookies(NextResponse.json({ error: "Your current password is incorrect." }, { status: 403 }));
    }

    const { data, error } = await supabase.rpc("delete_my_account");
    if (error?.message?.includes("Resolve future active sessions")) {
      return applyCookies(NextResponse.json(
        { error: "Cancel or decline your future sessions before deleting your account." },
        { status: 409 },
      ));
    }
    if (error || data !== true) {
      return applyCookies(NextResponse.json(
        { error: "Unable to delete your account." },
        { status: 503 },
      ));
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // The account is already gone; explicit cookie expiry below finishes local cleanup.
    }
    const response = applyCookies(NextResponse.json({ deleted: true }));
    return expireSupabaseAuthCookies(request, response);
  } catch {
    return NextResponse.json({ error: "Unable to delete your account." }, { status: 503 });
  }
}
