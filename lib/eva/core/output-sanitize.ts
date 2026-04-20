/**
 * Output sanitization shared by API persistence and client streaming display.
 * Keep this module free of server-only imports so it can run in the browser.
 */

const PROMPT_LEAK_PATTERNS = [
  /\[?system\]?\s*:.*$/im,
  /<\|im_start\|>.*$/im,
  /<\|im_end\|>/g,
  /Human\s*:.*$/im,
  /Assistant\s*:.*$/im,
  /^(system|human|assistant)\s*:\s*/im,
];

const ROLE_LINE = /^(system|human|assistant)\s*:\s*/i;
const MAX_OUTPUT_LENGTH = 10000;

export function sanitizeOutput(text: string): string {
  if (typeof text !== "string" || !text.trim()) return "";
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    let stripped = line;
    for (const pat of PROMPT_LEAK_PATTERNS) {
      stripped = stripped.replace(pat, "");
    }
    stripped = stripped.trim();
    if (stripped && !ROLE_LINE.test(stripped)) out.push(line);
  }
  let result = out.join("\n").trim() || text.trim();
  if (result.length > MAX_OUTPUT_LENGTH) {
    result = result.slice(0, MAX_OUTPUT_LENGTH - 3).trimEnd() + "...";
  }
  return result;
}

/**
 * Lighter pass when {@link sanitizeOutput} removes everything but the raw model
 * text still has substance (e.g. heavy role-line formatting). Strips risky tokens
 * without dropping whole lines, then trims.
 */
export function lenientOutputGuards(text: string): string {
  if (typeof text !== "string" || !text.trim()) return "";
  let t = text;
  t = t.replace(/<\|im_end\|>/g, "");
  t = t.replace(/<\|im_start\|>[^\n]*/gi, "");
  t = t.replace(/<\|redacted_im_end\|>/g, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.trim();
  if (t.length > MAX_OUTPUT_LENGTH) {
    t = t.slice(0, MAX_OUTPUT_LENGTH - 3).trimEnd() + "...";
  }
  return t;
}

export type FinalizeAssistantOutputResult = {
  text: string;
  /** True when strict {@link sanitizeOutput} returned empty but input had non-whitespace. */
  strictSanitizationCollapsed: boolean;
  /** True when {@link lenientOutputGuards} produced the final text. */
  usedLenientFallback: boolean;
};

/**
 * Choose text to persist/display: prefer strict sanitization; if it collapses to
 * empty while raw input is non-empty, try lenient guards (never silently drop a usable reply).
 */
export function finalizeAssistantOutput(
  raw: string,
): FinalizeAssistantOutputResult {
  const rawTrim = typeof raw === "string" ? raw.trim() : "";
  if (!rawTrim) {
    return {
      text: "",
      strictSanitizationCollapsed: false,
      usedLenientFallback: false,
    };
  }
  const strict = sanitizeOutput(raw);
  if (strict.trim().length > 0) {
    return {
      text: strict,
      strictSanitizationCollapsed: false,
      usedLenientFallback: false,
    };
  }
  const lenient = lenientOutputGuards(raw);
  if (lenient.trim().length > 0) {
    return {
      text: lenient,
      strictSanitizationCollapsed: true,
      usedLenientFallback: true,
    };
  }
  return {
    text: "",
    strictSanitizationCollapsed: rawTrim.length > 0,
    usedLenientFallback: false,
  };
}

/**
 * Use while streaming: run {@link sanitizeOutput}, but if it would blank partial output
 * (edge cases mid-token), keep the raw buffer so tokens stay visible (matches chatbot_v3).
 */
export function sanitizeAssistantStreamDisplay(raw: string): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const safe = sanitizeOutput(raw);
  return safe || raw;
}
