/**
 * Deterministic validation of evidence spans against the user message.
 * Ported from V1 evidence_validator.py.
 * A span is valid iff message[start:end] matches the span text (after whitespace normalization).
 */

export type EvidenceSpan = { start: number; end: number; text: string };

function normalizeWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Validate that each span's indices and text match the message.
 * Returns only spans that pass validation.
 */
export function validateSpans(
  message: string,
  spans: Array<{ start?: number; end?: number; text?: string }>,
): EvidenceSpan[] {
  if (!message || !spans?.length) return [];
  const valid: EvidenceSpan[] = [];
  for (const span of spans) {
    const start = span.start;
    const end = span.end;
    const text = span.text;
    if (start == null || end == null || text == null) continue;
    const s = Number(start);
    const e = Number(end);
    if (
      Number.isNaN(s) ||
      Number.isNaN(e) ||
      s < 0 ||
      e > message.length ||
      s >= e
    )
      continue;
    const substring = message.slice(s, e);
    if (normalizeWhitespace(substring) === normalizeWhitespace(text))
      valid.push({ start: s, end: e, text });
  }
  return valid;
}

/**
 * From extraction evidence (list of { field, start, end, text }), get spans for one field
 * and validate them against the message.
 */
export function getEvidenceForField(
  message: string,
  evidenceList: Array<{
    field?: string;
    start?: number;
    end?: number;
    text?: string;
  }>,
  field: string,
): EvidenceSpan[] {
  if (!evidenceList?.length) return [];
  const fieldSpans = evidenceList
    .filter(
      (s) =>
        s &&
        s.field === field &&
        s.start != null &&
        s.end != null &&
        s.text != null,
    )
    .map((s) => ({ start: s.start!, end: s.end!, text: s.text! }));
  return validateSpans(message, fieldSpans);
}

export function hasValidEvidence(
  message: string,
  spans: Array<{ start?: number; end?: number; text?: string }>,
): boolean {
  return validateSpans(message, spans).length > 0;
}
