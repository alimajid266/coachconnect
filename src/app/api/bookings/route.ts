import { NextRequest, NextResponse } from "next/server";
import { isMissingAuthSessionError, rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const rejection = rejectCrossOriginRequest(request);
  if (rejection) return rejection;
  try {
    const body = await request.json() as Record<string, unknown>;
    const slotId = typeof body.slotId === "string" ? body.slotId : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!uuid.test(slotId) || note.length > 500) return NextResponse.json({ error: "Choose a slot and keep your note under 500 characters." }, { status: 400 });
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && !isMissingAuthSessionError(authError)) return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    if (!authData.user) return applyCookies(NextResponse.json({ error: "Sign in to request this session." }, { status: 401 }));
    const { data, error } = await supabase.rpc("request_coach_booking", { target_slot_id: slotId, requested_note: note || null });
    if (error) {
      const message = /overlap/i.test(error.message)
        ? "That time overlaps another booking in your schedule."
        : /no longer available/i.test(error.message) ? "That slot is no longer available." : "The booking request could not be sent.";
      return applyCookies(NextResponse.json({ error: message }, { status: 409 }));
    }
    return applyCookies(NextResponse.json({ booking: data, message: "Request sent. The coach must accept before it is confirmed." }, { status: 201 }));
  } catch {
    return NextResponse.json({ error: "The booking request could not be sent." }, { status: 400 });
  }
}
