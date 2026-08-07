import { NextRequest, NextResponse } from "next/server";
import { isMissingAuthSessionError, rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const actions = ["accept", "decline", "cancel", "complete", "meeting-details", "review", "demo-payment"] as const;
type Action = typeof actions[number];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rejection = rejectCrossOriginRequest(request);
  if (rejection) return rejection;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const action = body.action as Action;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const meetingDetails = typeof body.meetingDetails === "string" ? body.meetingDetails.trim() : "";
    const rating = typeof body.rating === "number" ? body.rating : 0;
    const review = typeof body.review === "string" ? body.review.trim() : "";
    if (!uuid.test(id) || !actions.includes(action) || reason.length > 500
      || (action === "meeting-details" && (meetingDetails.length < 3 || meetingDetails.length > 500))
      || (action === "review" && (!Number.isInteger(rating) || rating < 1 || rating > 5 || review.length < 10 || review.length > 1000))) {
      return NextResponse.json({ error: "Invalid booking action." }, { status: 400 });
    }
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && !isMissingAuthSessionError(authError)) return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    if (!authData.user) return applyCookies(NextResponse.json({ error: "Sign in to manage this booking." }, { status: 401 }));

    const call = action === "accept" || action === "decline"
      ? supabase.rpc("respond_to_coach_booking", { target_booking_id: id, accept_booking: action === "accept" })
      : action === "cancel"
        ? supabase.rpc("cancel_coach_booking", { target_booking_id: id, requested_reason: reason || null })
        : action === "complete"
          ? supabase.rpc("complete_coach_booking", { target_booking_id: id })
          : action === "review"
            ? supabase.rpc("submit_coach_review", { target_booking_id: id, requested_rating: rating, requested_review: review })
            : action === "demo-payment"
              ? supabase.rpc("record_demo_booking_payment", { target_booking_id: id })
              : supabase.rpc("set_coach_booking_meeting_details", { target_booking_id: id, requested_details: meetingDetails });
    const { data, error } = await call;
    if (error) return applyCookies(NextResponse.json({ error: "This booking can no longer be changed." }, { status: 409 }));
    return applyCookies(NextResponse.json({ booking: data }));
  } catch {
    return NextResponse.json({ error: "This booking could not be changed." }, { status: 400 });
  }
}
