import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const PASSWORD_RESET_PATH = "/account/reset-password";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const nextPath = requestedNext === PASSWORD_RESET_PATH ? requestedNext : PASSWORD_RESET_PATH;

  if (!code) {
    return NextResponse.redirect(new URL("/account?error=recovery_link_invalid", request.url));
  }

  const { supabase, applyCookies } = createSupabaseRouteClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return applyCookies(
      NextResponse.redirect(new URL("/account?error=recovery_link_invalid", request.url)),
    );
  }

  return applyCookies(NextResponse.redirect(new URL(nextPath, request.url)));
}
