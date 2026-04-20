import { ProviderError } from "@/lib/furniture-gen/providers/interface";

export type RetryOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
};

const DEFAULT_RETRY_HINTS = [
  "429",
  "rate limit",
  "rate_limit",
  "timeout",
  "econnreset",
  "etimedout",
];
const DEFAULT_GIVE_UP_HINTS = [
  "401",
  "403",
  "422",
  "unauthorized",
  "forbidden",
];

function defaultShouldRetry(err: unknown): boolean {
  if (err instanceof ProviderError) {
    return err.retryable;
  }
  const msg = (
    err instanceof Error ? err.message : String(err ?? "")
  ).toLowerCase();
  if (DEFAULT_GIVE_UP_HINTS.some((h) => msg.includes(h))) return false;
  return DEFAULT_RETRY_HINTS.some((h) => msg.includes(h));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
  const initial = Math.max(0, opts.initialDelayMs ?? 2000);
  const maxDelay = Math.max(initial, opts.maxDelayMs ?? 30000);
  const predicate = opts.shouldRetry ?? defaultShouldRetry;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === maxAttempts;
      if (isLast || !predicate(err, attempt)) {
        throw err;
      }
      const delayMs = Math.min(maxDelay, initial * 2 ** (attempt - 1));
      opts.onRetry?.(err, attempt, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastErr;
}
