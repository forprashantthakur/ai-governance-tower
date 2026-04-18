import { NextRequest, NextResponse } from "next/server";
import { verifyJwt, extractBearerToken } from "./lib/auth/jwt";

const PUBLIC_PATHS = new Set([
  "/landing",
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
]);

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? "100");
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000");

// In-memory rate limiter (use Redis in multi-instance deployments)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW / 1000)),
          },
        }
      );
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // Root "/" — always redirect: login if unauthenticated, /models if authenticated
  if (pathname === "/") {
    const token =
      req.cookies.get("auth_token")?.value ??
      extractBearerToken(req.headers.get("authorization"));

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    try {
      await verifyJwt(token);
      return NextResponse.redirect(new URL("/models", req.url));
    } catch {
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete("auth_token");
      return res;
    }
  }

  // Protect all other dashboard routes
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/landing") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/register") &&
    !pathname.startsWith("/_next")
  ) {
    const token =
      req.cookies.get("auth_token")?.value ??
      extractBearerToken(req.headers.get("authorization"));

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    try {
      await verifyJwt(token);
    } catch {
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete("auth_token");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
