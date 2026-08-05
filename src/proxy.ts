import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PASSWORD_RESET_PATH = "/account/reset-password";

export function proxy(request: NextRequest) {
  const recoveryCode = request.nextUrl.searchParams.get("code");
  if (!recoveryCode) return NextResponse.next();

  const callbackUrl = request.nextUrl.clone();
  callbackUrl.pathname = "/auth/callback";
  callbackUrl.search = "";
  callbackUrl.searchParams.set("code", recoveryCode);
  callbackUrl.searchParams.set("next", PASSWORD_RESET_PATH);

  return NextResponse.redirect(callbackUrl);
}

export const config = {
  matcher: "/",
};
