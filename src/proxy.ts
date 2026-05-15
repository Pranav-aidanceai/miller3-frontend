import { NextRequest, NextResponse } from "next/server";

const WHITE_LISTED_ROUTES = [
  "/",
  "/auth/register",
  "/forgot-password",
  "/reset-password",
];

const PROTECTED_ROUTES = ["/search"];

const isWhiteListed = (pathname: string) =>
  WHITE_LISTED_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );

const isProtected = (pathname: string) =>
  PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
    '/((?!api|_next/data|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}