import { createHash } from "node:crypto";

/**
 * Provider rollout helpers (stages 3–4).
 * Stage 1 uses CHAT_PROVIDER=local; stage 5 uses openai for everyone.
 */

function parseAllowlist(raw: string | undefined): Set<string> {
  const set = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const value = part.trim().toLowerCase();
    if (value) set.add(value);
  }
  return set;
}

function rolloutPercent(): number {
  const raw = Number(process.env.CHAT_ROLLOUT_PERCENT ?? "100");
  if (!Number.isFinite(raw)) return 100;
  return Math.min(100, Math.max(0, Math.floor(raw)));
}

/**
 * Stable percent bucket 0–99 for a user id (not security-sensitive).
 */
export function chatRolloutBucket(userId: string): number {
  const digest = createHash("sha256").update(`chat-rollout:${userId}`).digest();
  return digest[0]! % 100;
}

/**
 * Whether this user should receive the production (OpenAI) chat provider
 * when CHAT_PROVIDER=openai. Local/dev still honors CHAT_PROVIDER=local.
 */
export function isChatOpenaiRolloutEnabled(input: {
  userId: string;
  email?: string | null;
}): boolean {
  const allowlist = parseAllowlist(process.env.CHAT_ROLLOUT_ALLOWLIST);
  const email = input.email?.trim().toLowerCase() ?? "";
  if (email && allowlist.has(email)) return true;
  if (allowlist.has(input.userId.toLowerCase())) return true;

  const percent = rolloutPercent();
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return chatRolloutBucket(input.userId) < percent;
}

/**
 * Shadow extraction compares OpenAI output without persisting proposals.
 */
export function isPreferenceExtractionShadowEnabled(): boolean {
  return process.env.PREFERENCE_EXTRACTION_SHADOW === "1";
}
