import { finalizeAssistantOutput } from "@/lib/eva/core/output-sanitize";

export type FinalizeChatOutputResult = {
  text: string;
  rawLength: number;
  finalizedLength: number;
  strictSanitizationCollapsed: boolean;
  usedLenientFallback: boolean;
  sanitizeCollapsedToEmpty: boolean;
};

/**
 * Wraps {@link finalizeAssistantOutput} with explicit length / collapse signals for logs and headers.
 */
export function finalizeChatModelOutput(raw: string): FinalizeChatOutputResult {
  const rawLength = raw.length;
  const fin = finalizeAssistantOutput(raw);
  const finalizedLength = fin.text.length;
  const sanitizeCollapsedToEmpty =
    raw.trim().length > 0 && fin.text.trim().length === 0;

  return {
    text: fin.text,
    rawLength,
    finalizedLength,
    strictSanitizationCollapsed: fin.strictSanitizationCollapsed,
    usedLenientFallback: fin.usedLenientFallback,
    sanitizeCollapsedToEmpty,
  };
}
