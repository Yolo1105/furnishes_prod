import { isActiveStatus } from "./image-generation-types";

const MIN_POLL_DELAY_MS = 2000;
const MAX_POLL_DELAY_MS = 20000;
const POLL_BACKOFF_FACTOR = 1.6;

export function shouldPoll(status: string, documentHidden: boolean): boolean {
  return isActiveStatus(status) && !documentHidden;
}

export function nextPollDelayMs(attempt: number): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const scaled = MIN_POLL_DELAY_MS * Math.pow(POLL_BACKOFF_FACTOR, safeAttempt);
  return Math.min(Math.round(scaled), MAX_POLL_DELAY_MS);
}

// eslint-disable-next-line no-control-regex -- intentionally strips control characters
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function altTextFromPrompt(prompt: string, max = 140): string {
  const clean = prompt.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  if (!clean) return "Generated room image";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

const PROVIDER_ERROR_COPY: Record<string, string> = {
  provider_unavailable:
    "Image generation isn’t configured for this environment yet.",
  rate_limited: "Daily image generation limit reached. Try again tomorrow.",
  concurrency_limit:
    "Wait for an in-progress generation to finish before starting another.",
};

export function errorCopyForCode(
  code: string | null | undefined,
  fallback: string,
): string {
  if (!code) return fallback;
  return PROVIDER_ERROR_COPY[code] ?? fallback;
}
