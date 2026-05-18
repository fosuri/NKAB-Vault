import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Global Proxy / Middleware Logic.
 * 
 * Intercepts incoming requests to enforce rate limiting and 
 * perform session-based redirection for protected routes.
 */
export async function proxy(request: NextRequest) {
  // Step 1: Rate Limiting Enforcement
  const skipRateLimit = process.env.PLAYWRIGHT_TEST === "true";
  const limitResult = skipRateLimit ? null : checkRateLimit(request);

  if (limitResult && !limitResult.success) {
    // Return standard 429 response with reset headers
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitResult.retryAfter),
          "X-RateLimit-Limit": String(limitResult.limit),
          "X-RateLimit-Remaining": String(limitResult.remaining),
          "X-RateLimit-Reset": String(Math.floor(limitResult.reset / 1000)),
        },
      },
    );
  }

  // Step 2: Access Control for Profile Routes
  if (request.nextUrl.pathname.startsWith("/profile")) {
    const sessionCookie = getSessionCookie(request);

    // Eject unauthenticated users to home page
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
