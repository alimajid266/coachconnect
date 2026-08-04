import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const password = typeof body.password === "string" ? body.password : "";
    const passwordConfirmation =
      typeof body.passwordConfirmation === "string" ? body.passwordConfirmation : "";

    if (password.length < 12) {
      return NextResponse.json({ error: "Password must be at least 12 characters." }, { status: 400 });
    }
    if (password !== passwordConfirmation) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return applyCookies(NextResponse.json(
        { error: "The recovery session is invalid or has expired." },
        { status: 401 },
      ));
    }

    await supabase.auth.signOut();
    return applyCookies(NextResponse.json({ message: "Password updated. You can now sign in." }));
  } catch {
    return NextResponse.json({ error: "Unable to update the password." }, { status: 400 });
  }
}
