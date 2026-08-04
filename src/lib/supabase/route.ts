import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { requestIsHttps } from "@/lib/auth-http";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function configuration() {
  const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { url, publishableKey };
}

export function createSupabaseRouteClient(request: NextRequest) {
  const { url, publishableKey } = configuration();
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookies) {
        pendingCookies.push(...cookies);
      },
    },
  });

  function applyCookies<T extends NextResponse>(response: T): T {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, {
        ...options,
        httpOnly: true,
        sameSite: "lax",
        secure: requestIsHttps(request),
        path: "/",
      });
    }
    return response;
  }

  return { supabase, applyCookies };
}
