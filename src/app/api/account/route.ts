import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest, requestIsHttps } from "@/lib/auth-http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createClient } from "@supabase/supabase-js";

async function removeMemberMedia(userId: string) {
  const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Storage cleanup unavailable");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const bucket = admin.storage.from("coach-profile-images");
  for (let page = 0; page < 20; page += 1) {
    const listed = await bucket.list(userId, { limit: 100, offset: 0 });
    if (listed.error) throw listed.error;
    const paths = (listed.data ?? []).filter((item) => item.name).map((item) => `${userId}/${item.name}`);
    if (paths.length === 0) return;
    const removed = await bucket.remove(paths);
    if (removed.error) throw removed.error;
  }
  throw new Error("Storage cleanup did not finish");
}

function expireSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (!name.startsWith("sb-") || !name.includes("auth-token")) continue;
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: requestIsHttps(request),
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

export async function DELETE(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 200) {
      return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
    }

    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return applyCookies(NextResponse.json({ error: "Sign in before deleting your account." }, { status: 401 }));
    }

    if (!authData.user.email) {
      return applyCookies(NextResponse.json({ error: "This account cannot be password-verified." }, { status: 400 }));
    }

    const { data: verified, error: verificationError } = await supabase.auth.signInWithPassword({
      email: authData.user.email,
      password: body.password,
    });
    if (verificationError || verified.user?.id !== authData.user.id) {
      return applyCookies(NextResponse.json({ error: "Your current password is incorrect." }, { status: 403 }));
    }

    const prepared = await supabase.rpc("begin_my_account_deletion");
    if (prepared.error?.message?.includes("Booking history must be retained")) {
      return applyCookies(NextResponse.json(
        { error: "Accounts with booking history cannot be self-deleted because the other participant's session record must be retained. Contact support for anonymization." },
        { status: 409 },
      ));
    }
    if (prepared.error || prepared.data !== true) {
      return applyCookies(NextResponse.json(
        { error: "Unable to delete your account." },
        { status: 503 },
      ));
    }
    try {
      await removeMemberMedia(authData.user.id);
    } catch {
      await supabase.rpc("cancel_my_account_deletion");
      return applyCookies(NextResponse.json(
        { error: "Unable to remove your profile images, so your account was kept." },
        { status: 503 },
      ));
    }
    const { data, error } = await supabase.rpc("delete_my_account");
    if (error || data !== true) {
      await supabase.rpc("cancel_my_account_deletion");
      return applyCookies(NextResponse.json({ error: "Unable to delete your account." }, { status: 503 }));
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // The account is already gone; explicit cookie expiry below finishes local cleanup.
    }
    const response = applyCookies(NextResponse.json({ deleted: true }));
    return expireSupabaseAuthCookies(request, response);
  } catch {
    return NextResponse.json({ error: "Unable to delete your account." }, { status: 503 });
  }
}
