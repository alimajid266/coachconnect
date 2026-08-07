import { NextRequest, NextResponse } from "next/server";
import { isMissingAuthSessionError, rejectCrossOriginRequest } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function message(error: string) {
  if (/valid future slot/i.test(error)) return "Choose a future start time at least 30 minutes from now, lasting 30 minutes to 3 hours.";
  if (/overlap.*booking/i.test(error)) return "That time overlaps an active booking in your schedule.";
  if (/overlap/i.test(error)) return "That time overlaps an existing slot.";
  if (/format/i.test(error)) return "That session format is not enabled on your coach profile.";
  if (/Approved coach/i.test(error)) return "Only approved coaches can add availability.";
  if (/active account/i.test(error)) return "Your account must be active before you can add availability.";
  return "The availability slot could not be saved. Please try again.";
}

async function authenticated(request: NextRequest) {
  const context = createSupabaseRouteClient(request);
  const { data, error } = await context.supabase.auth.getUser();
  return { ...context, user: !error || isMissingAuthSessionError(error) ? data.user : null, authError: error };
}

export async function POST(request: NextRequest) {
  const rejection = rejectCrossOriginRequest(request);
  if (rejection) return rejection;
  try {
    const body = await request.json() as Record<string, unknown>;
    const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
    const endsAt = typeof body.endsAt === "string" ? body.endsAt : "";
    const mode = body.mode;
    if (!startsAt || !endsAt || (mode !== "ONLINE" && mode !== "IN_PERSON") || Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt))) {
      return NextResponse.json({ error: "Choose a valid date, time and format." }, { status: 400 });
    }
    const { supabase, applyCookies, user, authError } = await authenticated(request);
    if (authError && !isMissingAuthSessionError(authError)) return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    if (!user) return applyCookies(NextResponse.json({ error: "Sign in as an approved coach." }, { status: 401 }));
    const { data, error } = await supabase.rpc("create_coach_availability_slot", {
      requested_start: startsAt, requested_end: endsAt, requested_mode: mode,
    });
    if (error) return applyCookies(NextResponse.json({ error: message(error.message) }, { status: 400 }));
    return applyCookies(NextResponse.json({ slot: data }, { status: 201 }));
  } catch {
    return NextResponse.json({ error: "The availability slot could not be saved." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const rejection = rejectCrossOriginRequest(request);
  if (rejection) return rejection;
  try {
    const body = await request.json() as Record<string, unknown>;
    const slotId = typeof body.slotId === "string" ? body.slotId : "";
    if (!uuid.test(slotId)) return NextResponse.json({ error: "Choose a valid availability slot." }, { status: 400 });
    const { supabase, applyCookies, user, authError } = await authenticated(request);
    if (authError && !isMissingAuthSessionError(authError)) return applyCookies(NextResponse.json({ error: "Account status is unavailable." }, { status: 503 }));
    if (!user) return applyCookies(NextResponse.json({ error: "Sign in as an approved coach." }, { status: 401 }));
    const { data, error } = await supabase.rpc("cancel_coach_availability_slot", { target_slot_id: slotId });
    if (error) return applyCookies(NextResponse.json({ error: /active booking/i.test(error.message) ? "Cancel the active booking before removing this slot." : "The slot could not be removed." }, { status: 400 }));
    return applyCookies(NextResponse.json({ slot: data }));
  } catch {
    return NextResponse.json({ error: "The slot could not be removed." }, { status: 400 });
  }
}
