import "server-only";

/**
 * Rate limiter — gates abuse-prone endpoints.
 *
 * Backend resolution:
 *   1. If UPSTASH_REDIS_REST_URL + TOKEN set → use Upstash (production)
 *   2. Otherwise → in-memory sliding window (dev / demo only)
 *
 * In-memory limiter is SAFE FOR DEVELOPMENT but NOT FOR PRODUCTION:
 *   - Per-process (no sync across workers)
 *   - Resets on restart
 *   - No TTL eviction beyond request-time cleanup
 *
 * Production MUST set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 * The code path auto-switches; no config changes needed.
 */

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
};

export type RateLimitConfig = {
  /** Max requests allowed per window */
  requests: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Namespace prefix — keep limits separate per endpoint family */
  prefix: string;
};

/* ── Presets (tune for real traffic) ───────────────────────── */

export const AUTH_LIMITS = {
  signup: { requests: 5, windowSeconds: 3600, prefix: "auth:signup" },
  login: { requests: 10, windowSeconds: 600, prefix: "auth:login" },
  forgot: { requests: 3, windowSeconds: 3600, prefix: "auth:forgot" },
  reset: { requests: 5, windowSeconds: 3600, prefix: "auth:reset" },
  verify: { requests: 10, windowSeconds: 3600, prefix: "auth:verify" },
} as const;

export const SUPPORT_LIMITS = {
  createHelp: { requests: 10, windowSeconds: 3600, prefix: "support:help" },
  createFeedback: {
    requests: 10,
    windowSeconds: 3600,
    prefix: "support:feedback",
  },
  reply: { requests: 30, windowSeconds: 3600, prefix: "support:reply" },
  close: { requests: 20, windowSeconds: 3600, prefix: "support:close" },
} as const;

/** Fal-backed furniture 2D→3D — expensive; cap per user (tune for product). */
export const FURNITURE_LIMITS = {
  /** Per signed-in user; uses Upstash in prod, in-memory in dev. */
  generate: {
    requests: 20,
    windowSeconds: 3600,
    prefix: "furniture:generate",
  },
} as const;

/** Furnishes Studio `/api/studio/*` — per signed-in user. */
export const STUDIO_API_LIMITS = {
  default: {
    requests: 200,
    windowSeconds: 3600,
    prefix: "studio:api",
  },
} as const;

/** Per-IP limits for Eva chat (shared Upstash / in-memory backend). */
export const EVA_CHAT_LIMITS = {
  requests: 30,
  windowSeconds: 60,
  prefix: "eva:chat",
} as const;

/** Per-IP limits for Eva extract (separate bucket from chat for ops tuning). */
export const EVA_EXTRACT_LIMITS = {
  requests: 30,
  windowSeconds: 60,
  prefix: "eva:extract",
} as const;

/** Presigned upload URL generation — abuse-prone; use with strictRateLimit in prod. */
export const UPLOAD_SIGN_LIMITS = {
  requests: 30,
  windowSeconds: 300,
  prefix: "uploads_sign",
} as const;

/** Payment-intent creation — separate from generic signup abuse bucket. */
export const CHECKOUT_LIMITS = {
  intent: {
    requests: 10,
    windowSeconds: 3600,
    prefix: "checkout:intent",
  },
  /** Placing an order from cart (creates Order + line items). */
  placeOrder: {
    requests: 20,
    windowSeconds: 3600,
    prefix: "checkout:order",
  },
} as const;

export type RateLimitPolicy = "soft" | "strict";

/* ── Implementation ───────────────────────────────────────── */

const useUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Check whether a given identity has exhausted its quota.
 * `key` is typically userId, but falls back to IP for unauthenticated
 * endpoints like signup/forgot.
 *
 * - `soft`: if Upstash errors, allow the request (fail open).
 * - `strict`: if Upstash errors, deny (fail closed) — use for auth/checkout.
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig,
  options?: { policy?: RateLimitPolicy },
): Promise<RateLimitResult> {
  const policy = options?.policy ?? "soft";
  if (useUpstash) return upstashLimit(key, config, policy);
  return memoryLimit(key, config);
}

/** Abuse-prone paths: fail closed when Redis is unavailable. */
export function strictRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  return rateLimit(key, config, { policy: "strict" });
}

/* ── In-memory (dev) ──────────────────────────────────────── */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function memoryLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const fullKey = `${config.prefix}:${key}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const existing = buckets.get(fullKey);
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(fullKey, { count: 1, resetAt });
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      resetAt,
    };
  }

  existing.count++;
  const success = existing.count <= config.requests;
  return {
    success,
    limit: config.requests,
    remaining: Math.max(0, config.requests - existing.count),
    resetAt: existing.resetAt,
  };
}

/* ── Upstash Redis (production) ───────────────────────────── */

async function upstashLimit(
  key: string,
  config: RateLimitConfig,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const fullKey = `${config.prefix}:${key}`;
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  // Atomic INCR with EXPIRE on first hit — Redis pipeline
  const pipeline = [
    ["INCR", fullKey],
    ["EXPIRE", fullKey, config.windowSeconds.toString(), "NX"],
    ["PTTL", fullKey],
  ];

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pipeline),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`[ratelimit] upstash failed (${policy}):`, res.status);
    if (policy === "strict") {
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        resetAt: Date.now() + 60_000,
      };
    }
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests,
      resetAt: Date.now() + config.windowSeconds * 1000,
    };
  }

  const parsed = (await res.json()) as Array<{ result: number }>;
  const count = parsed[0]?.result ?? 0;
  const ttlMs = parsed[2]?.result ?? config.windowSeconds * 1000;

  return {
    success: count <= config.requests,
    limit: config.requests,
    remaining: Math.max(0, config.requests - count),
    resetAt: Date.now() + ttlMs,
  };
}

/**
 * Human-readable 429 error body. Consistent shape across all endpoints.
 */
export function rateLimitError(result: RateLimitResult): {
  error: string;
  message: string;
  retryAfterSeconds: number;
} {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000),
  );
  return {
    error: "RATE_LIMIT_EXCEEDED",
    message: `Too many requests. Try again in ${formatRetry(retryAfterSeconds)}.`,
    retryAfterSeconds,
  };
}

function formatRetry(s: number): string {
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  const m = Math.ceil(s / 60);
  return `${m} minute${m === 1 ? "" : "s"}`;
}
