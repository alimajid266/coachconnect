import { NextRequest, NextResponse } from "next/server";

export function rejectCrossOriginRequest(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const expectedHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const expectedProtocol =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");

  try {
    const suppliedOrigin = new URL(origin);
    if (suppliedOrigin.host === expectedHost && suppliedOrigin.protocol === `${expectedProtocol}:`) {
      return null;
    }
  } catch {
    // Malformed origins are rejected below.
  }

  return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
}

export function requestIsHttps(request: NextRequest): boolean {
  return request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";
}
