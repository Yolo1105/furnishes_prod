import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handlers } from "@/auth";
import { strictRateLimit, rateLimitError, AUTH_LIMITS } from "@/lib/rate-limit";
import { clientIdentity } from "@/lib/api/identity";

export const dynamic = "force-dynamic";

export const { GET } = handlers;

function isCredentialsSignIn(url: string): boolean {
  try {
    const p = new URL(url).pathname;
    return (
      p.includes("callback/credentials") || p.endsWith("/signin/credentials")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (isCredentialsSignIn(req.url)) {
    const limit = await strictRateLimit(clientIdentity(req), AUTH_LIMITS.login);
    if (!limit.success) {
      return NextResponse.json(rateLimitError(limit), {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
        },
      });
    }
  }
  return await handlers.POST(req);
}
