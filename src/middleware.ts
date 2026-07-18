import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth",
];

// Static file extensions that should always be allowed
const STATIC_EXTENSIONS = /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot|json|txt|xml|webp|gif)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files
  if (STATIC_EXTENSIONS.test(pathname)) {
    return NextResponse.next();
  }

  // Allow Next.js internal paths
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Allow public paths
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get("logistiqs_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
