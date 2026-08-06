import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.signOut();
    if (error) return applyCookies(NextResponse.json({ error: "Unable to sign out." }, { status: 503 }));
    return applyCookies(NextResponse.json({ signedOut: true }));
  } catch {
    return NextResponse.json({ error: "Unable to sign out." }, { status: 503 });
  }
}
