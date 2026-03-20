import createMiddleware from "next-intl/middleware";
import { auth0 } from "@/lib/auth0";
import { routing } from "@/i18n/routing";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Auth0 handle auth routes
  if (pathname.startsWith("/auth/")) {
    return await auth0.middleware(request);
  }

  // Run Auth0 middleware first (for session handling)
  const authResponse = await auth0.middleware(request);

  // Then apply i18n routing
  const intlResponse = intlMiddleware(request);

  // Merge auth cookies into intl response
  if (authResponse.headers.has("set-cookie")) {
    const cookies = authResponse.headers.getSetCookie();
    for (const cookie of cookies) {
      intlResponse.headers.append("set-cookie", cookie);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/).*)",
  ],
};
