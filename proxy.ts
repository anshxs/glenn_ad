import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "admin_session";
const secretKey = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret-change-in-production-32chars"
);

const protectedRoutes = [
  "/dashboard",
  "/notes",
  "/announcements",
  "/app_config",
  "/users",
  "/community",
  "/templates",
  "/tournaments",
  "/tournament-results",
  "/organiser-transactions",
  "/transactions",
];

const authRoutes = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAuthRoute = authRoutes.includes(pathname);

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Verify token
  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, secretKey);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from the login page
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/notes/:path*",
    "/announcements/:path*",
    "/app_config/:path*",
    "/users/:path*",
    "/community/:path*",
    "/templates/:path*",
    "/tournaments/:path*",
    "/tournament-results/:path*",
    "/organiser-transactions/:path*",
    "/transactions/:path*",
    "/login",
  ],
};
