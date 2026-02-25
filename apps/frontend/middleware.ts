import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth"];
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "changeme");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/avatars")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("accessToken")?.value;

  if (!token) {
    const redirect = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?redirect=${redirect}`, req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Redirect authenticated users away from login
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/projects", req.url));
    }

    // Block non-admins from user management
    if (pathname.startsWith("/settings/users") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/projects", req.url));
    }

    // Forward user info as headers for server components
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", String(payload.userId ?? payload.sub ?? ""));
    requestHeaders.set("x-tenant-id", String(payload.tenantId ?? ""));

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    const redirect = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?redirect=${redirect}`, req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
