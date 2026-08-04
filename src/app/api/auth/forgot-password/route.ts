import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const RESET_SUCCESS_MESSAGE = "Check your inbox for password reset instructions.";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("next", "/account/reset-password");

    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl.toString(),
    });

    if (error) {
      const status = error.status === 429 ? 429 : 400;
      return applyCookies(NextResponse.json({ error: error.message }, { status }));
    }

    return applyCookies(NextResponse.json({ message: RESET_SUCCESS_MESSAGE }));
  } catch {
    return NextResponse.json({ error: "Unable to request a password reset." }, { status: 400 });
  }
}
