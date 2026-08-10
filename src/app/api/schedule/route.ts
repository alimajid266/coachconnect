import { NextRequest, NextResponse } from "next/server";
import { isMissingAuthSessionError } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { ownedSlot, scheduleBooking } from "@/lib/scheduling";

export async function GET(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && !isMissingAuthSessionError(authError)) return applyCookies(NextResponse.json({ error: "Schedule is unavailable." }, { status: 503 }));
    if (!authData.user) return applyCookies(NextResponse.json({ error: "Sign in to view your schedule." }, { status: 401 }));
    const [bookingResult, slotResult, reviewResult] = await Promise.all([
      supabase.rpc("list_my_coach_schedule"),
      supabase.rpc("list_my_coach_slots"),
      supabase.rpc("list_my_coach_reviews"),
    ]);
    if (bookingResult.error || slotResult.error || reviewResult.error) return applyCookies(NextResponse.json({ error: "Schedule is unavailable." }, { status: 503 }));
    const reviews = new Map((Array.isArray(reviewResult.data) ? reviewResult.data : []).map((row) => {
      const record = row as Record<string, unknown>;
      return [String(record.booking_id), {
        review_rating: record.rating,
        review_body: record.review_body,
      }];
    }));
    const bookings = Array.isArray(bookingResult.data) ? bookingResult.data.flatMap((row) => {
      const record = row as Record<string, unknown>;
      const value = scheduleBooking({ ...record, ...(reviews.get(String(record.booking_id)) ?? {}) });
      return value ? [value] : [];
    }) : [];
    const slots = Array.isArray(slotResult.data) ? slotResult.data.flatMap((row) => {
      const value = ownedSlot(row as Record<string, unknown>);
      return value ? [value] : [];
    }) : [];
    return applyCookies(NextResponse.json({ userId: authData.user.id, bookings, slots }, { headers: { "Cache-Control": "no-store" } }));
  } catch {
    return NextResponse.json({ error: "Schedule is unavailable." }, { status: 503 });
  }
}
