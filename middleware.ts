import { NextRequest, NextResponse } from "next/server";

// Lightweight check: presence of the session cookie only. Full
// verification (adminAuth.verifySessionCookie) happens in server
// components/actions, since Edge middleware can't use firebase-admin.
const PROTECTED_PREFIXES = ["/dashboard", "/project", "/onboarding"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has("session");
  if (!hasSession) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/project/:path*", "/onboarding"],
};
