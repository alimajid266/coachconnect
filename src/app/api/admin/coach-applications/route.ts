import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/auth-http";
import { coachApplicationStatuses, serializeCoachApplication } from "@/lib/coach-application";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

async function requireAdministrator(request: NextRequest) {
  const context = createSupabaseRouteClient(request);
  const { data: authData, error: authError } = await context.supabase.auth.getUser();
  if (authError || !authData.user) return { ...context, error: "unauthenticated" as const, userId: null };

  const { data: profile, error: profileError } = await context.supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (profileError || profile?.role !== "ADMIN") {
    return { ...context, error: "forbidden" as const, userId: authData.user.id };
  }
  return { ...context, error: null, userId: authData.user.id };
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireAdministrator(request);
    if (context.error) {
      const status = context.error === "unauthenticated" ? 401 : 403;
      return context.applyCookies(NextResponse.json({ error: "Administrator access is required." }, { status }));
    }

    const { data, error } = await context.supabase
      .from("coach_applications")
      .select("*, profiles!coach_applications_user_id_fkey(display_name,account_status,account_suspension_reason)")
      .neq("status", "DRAFT")
      .order("submitted_at", { ascending: true, nullsFirst: false });
    if (error) {
      return context.applyCookies(NextResponse.json({ error: "Coach applications are temporarily unavailable." }, { status: 503 }));
    }

    const applications = (data ?? []).map((row) => ({
      ...serializeCoachApplication(row),
      applicantName: row.profiles?.display_name ?? "Member",
      accountStatus: row.profiles?.account_status ?? "ACTIVE",
      accountSuspensionReason: row.profiles?.account_suspension_reason ?? null,
    }));
    return context.applyCookies(NextResponse.json({ applications }));
  } catch {
    return NextResponse.json({ error: "Coach applications are temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const context = await requireAdministrator(request);
    if (context.error) {
      const status = context.error === "unauthenticated" ? 401 : 403;
      return context.applyCookies(NextResponse.json({ error: "Administrator access is required." }, { status }));
    }

    const body = await request.json() as { userId?: unknown; decision?: unknown; note?: unknown; accountSuspended?: unknown };
    const userId = typeof body.userId === "string" ? body.userId : "";
    const decision = typeof body.decision === "string" ? body.decision : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : null;
    const allowedDecisions = coachApplicationStatuses.filter((status) => ["UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"].includes(status));

    if (!userId || (typeof body.accountSuspended !== "boolean" && !allowedDecisions.includes(decision as typeof allowedDecisions[number]))) {
      return context.applyCookies(NextResponse.json({ error: "Choose a valid review decision." }, { status: 400 }));
    }
    if (userId === context.userId) {
      return context.applyCookies(NextResponse.json({ error: "Administrators cannot review their own application." }, { status: 400 }));
    }
    if (typeof body.accountSuspended === "boolean") {
      if (body.accountSuspended && !note) {
        return context.applyCookies(NextResponse.json({ error: "Explain why the full member account is being suspended." }, { status: 400 }));
      }
      const { data, error } = await context.supabase.rpc("set_member_account_suspension", {
        target_user_id: userId,
        suspend_account: body.accountSuspended,
        requested_reason: note,
      });
      if (error) return context.applyCookies(NextResponse.json({ error: "The member account status could not be updated." }, { status: 400 }));
      return context.applyCookies(NextResponse.json({ account: {
        status: data.account_status,
        suspensionReason: data.account_suspension_reason,
      } }));
    }
    if (decision === "REJECTED" && !note) {
      return context.applyCookies(NextResponse.json({ error: "Explain what the applicant needs to change." }, { status: 400 }));
    }
    if (decision === "SUSPENDED" && !note) {
      return context.applyCookies(NextResponse.json({ error: "Explain why this coach profile is being suspended." }, { status: 400 }));
    }

    const { data, error } = await context.supabase.rpc("review_coach_application", {
      target_user_id: userId,
      decision,
      note,
    });
    if (error) {
      return context.applyCookies(NextResponse.json({ error: "The application status could not be updated." }, { status: 400 }));
    }
    return context.applyCookies(NextResponse.json({ application: serializeCoachApplication(data) }));
  } catch {
    return NextResponse.json({ error: "The application status could not be updated." }, { status: 400 });
  }
}
