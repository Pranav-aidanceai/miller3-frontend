import { NextRequest, NextResponse } from "next/server";
import { isCrossSiteRequest } from "@/lib/csrf";

const WHITE_LISTED_ROUTES = [
  "/",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

const PROTECTED_ROUTES = ["/search", "/admin", "/ai-search", "/query-history", "/plan", "/buy-credits"];

const isWhiteListed = (pathname: string) =>
  WHITE_LISTED_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );

const isProtected = (pathname: string) =>
  PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes: only the cross-site check. Page redirects below don't apply,
  // and authentication is enforced by the backend on every forwarded call.
  if (pathname.startsWith("/api/")) {
    if (isCrossSiteRequest(request)) {
      return NextResponse.json(
        { errors: [{ code: "CROSS_SITE_REQUEST", message: "Cross-site requests are not allowed." }] },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  const token = request.cookies.get("refresh_token")?.value;

  if (isProtected(pathname) && !token) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isWhiteListed(pathname) && token) {
    return NextResponse.redirect(new URL("/search", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // /api is included so state-changing calls get the cross-site check.
    '/((?!_next/data|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|\\.swa).*)',
  ],
}