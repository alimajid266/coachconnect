import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const RESEND_SUCCESS_MESSAGE =
  "If an unconfirmed account exists, a new confirmation email has been sent.";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: new URL("/account", request.url).toString() },
    });

    if (error) {
      const status = error.status === 429 ? 429 : 400;
      return applyCookies(NextResponse.json({ error: error.message }, { status }));
    }

    return applyCookies(NextResponse.json({ message: RESEND_SUCCESS_MESSAGE }));
  } catch {
    return NextResponse.json({ error: "Unable to resend the confirmation email." }, { status: 400 });
  }
}
