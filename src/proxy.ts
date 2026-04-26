import { NextRequest, NextResponse } from "next/server";

const WHITE_LISTED_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
];

const isWhiteListed = (pathname: string) =>
  WHITE_LISTED_ROUTES.some((route) => pathname.startsWith(route));

const isProtected = (pathname: string) =>
  PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  // If visiting a protected route without a token → redirect to login
  if (isProtected(pathname) && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname); // preserve intended destination
    return NextResponse.redirect(loginUrl);
  }

  // If visiting a whitelisted route with a token → redirect to dashboard
  if (isWhiteListed(pathname) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).)*",
  ],
};