import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RENTAL_HOST = "rentals.flashpointuiuc.com";

const RENTAL_PATHS = [
  "/gear",
  "/login",
  "/register",
  "/my-rentals",
  "/manager",
  "/admin",
  "/how-this-works",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

function isRentalPath(pathname: string) {
  return RENTAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isRentalHost = host === RENTAL_HOST;
  const isLocalDev = host === "localhost" || host === "127.0.0.1";

  if (isRentalHost) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/rentals", request.url));
    }
    if (!pathname.startsWith("/rentals") && isRentalPath(pathname)) {
      return NextResponse.rewrite(new URL(`/rentals${pathname}`, request.url));
    }
    return NextResponse.next();
  }

  if (isLocalDev && isRentalPath(pathname) && !pathname.startsWith("/rentals")) {
    return NextResponse.rewrite(new URL(`/rentals${pathname}`, request.url));
  }

  if (isRentalPath(pathname)) {
    const url = new URL(`https://${RENTAL_HOST}${pathname}`);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/rentals") && !isLocalDev) {
    const stripped = pathname.replace(/^\/rentals/, "") || "/";
    return NextResponse.redirect(
      new URL(`https://${RENTAL_HOST}${stripped}`),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.webp|gallery|uploads).*)"],
};
