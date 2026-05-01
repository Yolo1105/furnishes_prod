import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth/auth-secret";
import { isMockAuthEnabled } from "@/lib/auth/mock-auth";
import { isStudioEnabled } from "@/lib/studio/studio-enabled";
import { isStudioPlaygroundPathname } from "@/lib/routes/studio-playground-path";

const PROTECTED_PATHS = [
  "/account",
  "/checkout",
  "/cart",
  "/admin",
  "/api/studio",
] as const;
const MOCK_AUTH_COOKIE = "furnishes-mock-auth";

function requireApiAuth(): boolean {
  const v = process.env.EVA_REQUIRE_API_AUTH?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

let mockAuthProdWarned = false;
let authSecretProdWarned = false;

function getAuthSecretForMiddleware(): string | null {
  try {
    return getAuthSecret();
  } catch (error) {
    if (process.env.NODE_ENV === "production" && !authSecretProdWarned) {
      authSecretProdWarned = true;
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "warn",
          event: "auth_secret_missing_in_middleware",
          message:
            error instanceof Error
              ? error.message
              : "Unknown auth secret error",
          fix: "Set AUTH_SECRET or NEXTAUTH_SECRET in deployment environment variables.",
        }),
      );
    }
    return null;
  }
}

function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

/** Lets server layouts read the request path after middleware (e.g. login `next=` parity). */
function nextWithPathname(req: NextRequest, pathname: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  return addSecurityHeaders(res);
}

/**
 * CSP is set only in `next.config.ts` from `lib/site/content-security-policy.ts`
 * (production). Do not duplicate CSP here — avoids split-brain security headers.
 *
 * - `/account`, `/checkout`, `/cart`, `/admin`: require JWT session (or mock cookie in dev).
 * - `/api/*` when `EVA_REQUIRE_API_AUTH`: require JWT (401 JSON).
 */
export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const res = nextWithPathname(req, path);

  if (!isStudioEnabled()) {
    if (path.startsWith("/api/studio")) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Studio is disabled", code: "STUDIO_DISABLED" },
          { status: 503 },
        ),
      );
    }
    if (isStudioPlaygroundPathname(path)) {
      return addSecurityHeaders(
        NextResponse.rewrite(new URL("/not-found", req.url)),
      );
    }
  }

  const isProtected =
    PROTECTED_PATHS.some((p) => path.startsWith(p)) ||
    isStudioPlaygroundPathname(path);
  if (isProtected) {
    const mockOk =
      isMockAuthEnabled() && req.cookies.get(MOCK_AUTH_COOKIE)?.value === "1";
    if (mockOk) {
      if (process.env.NODE_ENV === "production" && !mockAuthProdWarned) {
        mockAuthProdWarned = true;
        console.warn(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: "warn",
            event: "mock_auth_cookie_production",
            fix: "Unset ALLOW_MOCK_AUTH unless this is an intentional demo/staging environment.",
          }),
        );
      }
      return res;
    }
    const secret = getAuthSecretForMiddleware();
    if (!secret) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", path);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
    const token = await getToken({ req, secret });
    if (!token) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", path);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
    return res;
  }

  if (path.startsWith("/api/") && requireApiAuth()) {
    const secret = getAuthSecretForMiddleware();
    if (!secret) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    const token = await getToken({ req, secret });
    if (!token) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|images/|api/auth(?:/|$)|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp)$).*)",
  ],
};
