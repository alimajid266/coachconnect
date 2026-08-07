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
    const [bookingResult, slotResult] = await Promise.all([
      supabase.rpc("list_my_coach_schedule"),
      supabase.rpc("list_my_coach_slots"),
    ]);
    if (bookingResult.error || slotResult.error) return applyCookies(NextResponse.json({ error: "Schedule is unavailable." }, { status: 503 }));
    const bookings = Array.isArray(bookingResult.data) ? bookingResult.data.flatMap((row) => {
      const value = scheduleBooking(row as Record<string, unknown>);
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
