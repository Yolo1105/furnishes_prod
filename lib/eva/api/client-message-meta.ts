/**
 * Shared client hints for chat + extract: same semantics in one place (no duplicated OR logic).
 */

import { z } from "zod";

export const ClientMessageSourceSchema = z.enum(["quick_suggestion", "typed"]);
export type ClientMessageSource = z.infer<typeof ClientMessageSourceSchema>;

/** Skip preference extraction when the client marks a chip/preset or explicit skip. */
export function shouldSkipExtractionFromClientMeta(
  messageSource: ClientMessageSource | undefined,
  skipExtraction: boolean | undefined,
): boolean {
  return skipExtraction === true || messageSource === "quick_suggestion";
}
