import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { envInt } from "@/server/env";
import { blocksForEmailVerification } from "@/server/auth/email-verification";
import { getOptionalCurrentSession } from "@/server/auth/session";
import type { ServiceResult } from "@/server/result";

export function jsonOk<T>(value: T, init?: ResponseInit) {
  return NextResponse.json(value, init);
}

export function jsonError(
  status: number,
  error: string,
  message: string,
  fieldErrors?: Record<string, string>,
) {
  return NextResponse.json(
    {
      error,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    { status },
  );
}

export function fromServiceResult<T, E extends string>(
  result: ServiceResult<T, E>,
  map?: Partial<Record<E, number>>,
) {
  if (result.ok) {
    return jsonOk(result.value);
  }
  const status = map?.[result.error] ?? defaultStatus(result.error);
  return jsonError(
    status,
    result.error,
    result.message ?? "The request could not be completed.",
    result.fieldErrors,
  );
}

function defaultStatus(error: string): number {
  switch (error) {
    case "validation":
    case "invalid_prompt":
    case "invalid_size":
    case "unsupported_source":
    case "moderation_rejected":
      return 400;
    case "auth_failed":
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
    case "invalid_token":
      return 404;
    case "rate_limited":
    case "daily_limit":
    case "concurrency_limit":
    case "cost_limit":
      return 429;
    case "email_taken":
    case "duplicate":
      return 409;
    case "generation_in_progress":
    case "already_complete":
    case "not_cancelable":
    case "conflict":
    case "cart_empty":
    case "currency_mismatch":
    case "invalid_status":
      return 409;
    case "provider_unavailable":
    case "disabled":
    case "commerce_disabled":
    case "provider_disabled":
      return 503;
    case "provider_failed":
    case "storage_failed":
      return 502;
    default:
      return 400;
  }
}

/**
 * Guards an account API route. Pass `allowUnverified` for the few endpoints an
 * unverified user still needs (resending their verification mail), so the
 * verification gate cannot lock someone out of fixing it.
 */
export async function requireApiSession(options?: {
  allowUnverified?: boolean;
}) {
  const csrf = assertSameOriginFromHeaders(await headers());
  if (csrf) {
    return { session: null, response: csrf } as const;
  }
  const session = await getOptionalCurrentSession();
  if (!session) {
    return {
      session: null,
      response: jsonError(401, "unauthorized", "Sign in to continue."),
    } as const;
  }
  if (!options?.allowUnverified && blocksForEmailVerification(session.user)) {
    return {
      session: null,
      response: jsonError(
        403,
        "email_unverified",
        "Verify your email address to continue.",
      ),
    } as const;
  }
  return { session, response: null } as const;
}

function trustedProxyHops(): number {
  return envInt("TRUSTED_PROXY_HOPS", 1);
}

/**
 * Client IP for rate limits. Counts from the right by TRUSTED_PROXY_HOPS so a
 * spoofed leftmost x-forwarded-for hop cannot bypass IP-keyed limits.
 */
export function clientIp(request: Request): string | null {
  const hops =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const trusted = trustedProxyHops();
  const idx = hops.length - trusted - 1;
  if (idx >= 0) return hops[idx] ?? null;
  return request.headers.get("x-real-ip")?.trim() || hops[0] || null;
}

export function assertSameOrigin(request: Request): Response | null {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  return assertSameOriginFromHeaders(request.headers, request.method);
}

function assertSameOriginFromHeaders(
  headerBag: Headers,
  method?: string,
): Response | null {
  const verb = (method ?? "").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(verb)) return null;

  if (verb) {
    const site = headerBag.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      return jsonError(403, "forbidden", "Cross-site request rejected.");
    }
  }

  const origin = headerBag.get("origin");
  const expected = process.env.APP_ORIGIN?.trim();
  if (origin && expected && origin !== expected) {
    return jsonError(403, "forbidden", "Cross-site request rejected.");
  }
  return null;
}
