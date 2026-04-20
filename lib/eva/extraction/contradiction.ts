/**
 * Contradiction detection: existing value vs new value.
 * If user has change intent ("actually", "instead") -> allow update.
 * Else -> ask confirmation. Ported from V1 contradiction_handler.py.
 */
import { getFieldLabel } from "@/lib/eva/domain/fields";

const CHANGE_INTENT_PATTERNS = [
  /\bactually\b/,
  /\binstead\b/,
  /\bchanged\s+my\s+mind\b/,
  /\bchange\s+it\s+to\b/,
  /\brather\s+(?:have|want|prefer)\b/,
  /\bno(?:t)?\s+(?:longer|more)\b/,
  /\b(?:lets?|let's)\s+go\s+with\b/,
  /\b(?:i|we)\s+(?:want|prefer)\s+(?:to\s+)?(?:change|switch)\b/,
];

export function detectChangeIntent(message: string): boolean {
  if (!message?.trim()) return false;
  const lower = message.toLowerCase().trim();
  return CHANGE_INTENT_PATTERNS.some((p) => p.test(lower));
}

export interface ContradictionResult {
  hasConflict: boolean;
  confirmMessage?: string;
  allowUpdate: boolean;
}

/**
 * Check if new value contradicts current preferences for field.
 * currentPreferences: Record<field, value> (e.g. from Prisma Preference list).
 */
export function checkContradiction(
  currentPreferences: Record<string, string>,
  newField: string,
  newValue: string,
  userMessage: string,
): ContradictionResult {
  const current = currentPreferences[newField] ?? "";
  if (!current.trim()) return { hasConflict: false, allowUpdate: true };
  const newStr = (newValue ?? "").trim();
  if (!newStr) return { hasConflict: false, allowUpdate: true };
  const curNorm = current.toLowerCase().trim();
  const newNorm = newStr.toLowerCase().trim();
  if (curNorm === newNorm) return { hasConflict: false, allowUpdate: true };
  const changeIntent = detectChangeIntent(userMessage);
  if (changeIntent) return { hasConflict: true, allowUpdate: true };
  const label = getFieldLabel(newField);
  return {
    hasConflict: true,
    confirmMessage: `Do you want to replace your ${label} (${current}) with ${newStr}?`,
    allowUpdate: false,
  };
}
