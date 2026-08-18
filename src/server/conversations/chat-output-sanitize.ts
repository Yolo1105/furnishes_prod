/**
 * Sanitize model output before persistence / display.
 * Strict path strips role-leak lines; lenient path only strips special tokens.
 */

const MAX_ASSISTANT_CHARS = 10_000;

const ROLE_LEAK_LINE =
  /^\s*(?:\[?\s*system\s*\]?\s*:|<\|im_(?:start|end)\|>|human\s*:|assistant\s*:)/i;

const SPECIAL_TOKENS = /<\|im_(?:start|end)\|>/gi;

export function sanitizeOutput(text: string): string {
  if (typeof text !== "string") return "";
  const withoutTokens = text.replace(SPECIAL_TOKENS, "");
  const kept = withoutTokens
    .split(/\r?\n/)
    .filter((line) => !ROLE_LEAK_LINE.test(line))
    .join("\n")
    .trim();
  if (kept.length <= MAX_ASSISTANT_CHARS) return kept;
  return `${kept.slice(0, MAX_ASSISTANT_CHARS)}...`;
}

function lenientOutputGuards(text: string): string {
  if (typeof text !== "string") return "";
  const cleaned = text.replace(SPECIAL_TOKENS, "").trim();
  if (cleaned.length <= MAX_ASSISTANT_CHARS) return cleaned;
  return `${cleaned.slice(0, MAX_ASSISTANT_CHARS)}...`;
}

type FinalizeChatOutputResult = {
  text: string;
  strictSanitizationCollapsed: boolean;
  usedLenientFallback: boolean;
};

export function finalizeChatModelOutput(raw: string): FinalizeChatOutputResult {
  const rawTrim = typeof raw === "string" ? raw.trim() : "";
  if (!rawTrim) {
    return {
      text: "",
      strictSanitizationCollapsed: false,
      usedLenientFallback: false,
    };
  }
  const strict = sanitizeOutput(raw);
  if (strict.trim()) {
    return {
      text: strict,
      strictSanitizationCollapsed: false,
      usedLenientFallback: false,
    };
  }
  const lenient = lenientOutputGuards(raw);
  if (lenient.trim()) {
    return {
      text: lenient,
      strictSanitizationCollapsed: true,
      usedLenientFallback: true,
    };
  }
  return {
    text: "",
    strictSanitizationCollapsed: true,
    usedLenientFallback: false,
  };
}
