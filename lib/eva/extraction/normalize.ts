/**
 * Normalize extracted entity values against vocabulary. Ported from V2 extraction.py _normalize_value.
 */
import { expandVocabulary } from "./vocabulary";

export const CONFIDENCE_HIGH = 0.9;
export const CONFIDENCE_MEDIUM = 0.6;
export const CONFIDENCE_LOW = 0.3;

export interface FieldConfig {
  type?: string;
  vocabulary?: string[];
}

/**
 * Normalize a single string value. If vocabulary list provided, match to it (exact then partial);
 * otherwise use expandVocabulary for slang expansion.
 */
export function normalizeSingle(
  raw: string,
  vocabulary: string[] = [],
): [string, number] {
  const r = (raw ?? "").trim();
  if (!r) return [r, 0];
  const expanded = expandVocabulary(r);
  const low = expanded.toLowerCase();
  if (vocabulary.length) {
    for (const v of vocabulary) {
      if (v.toLowerCase() === low) return [v, CONFIDENCE_HIGH];
    }
    for (const v of vocabulary) {
      const vLow = v.toLowerCase();
      if (low.includes(vLow) || vLow.includes(low))
        return [v, CONFIDENCE_MEDIUM];
    }
    return [expanded, vocabulary.length ? CONFIDENCE_MEDIUM : CONFIDENCE_HIGH];
  }
  return [expanded, CONFIDENCE_HIGH];
}

/**
 * Normalize value using optional field config (vocabulary, type). Return [normalized_value, confidence].
 */
export function normalizeValue(
  value: unknown,
  fieldConfig?: FieldConfig,
): [string | string[], number] {
  if (value == null || value === "") return [value as string, 0];
  const vocab = fieldConfig?.vocabulary ?? [];
  const fieldType = (fieldConfig?.type ?? "string").toLowerCase();
  if (fieldType === "list") {
    if (Array.isArray(value)) {
      const normalized: string[] = [];
      for (const v of value) {
        const [n] = normalizeSingle(String(v), vocab);
        if (n) normalized.push(n);
      }
      return [normalized, normalized.length ? CONFIDENCE_HIGH : CONFIDENCE_LOW];
    }
    if (typeof value === "string") {
      const parts = value
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter(Boolean);
      const normalized = parts.map((p) => {
        const [n] = normalizeSingle(p, vocab);
        return n ?? p;
      });
      return [normalized, CONFIDENCE_MEDIUM];
    }
    return [value as string[], CONFIDENCE_MEDIUM];
  }
  if (typeof value === "string") {
    return normalizeSingle(value, vocab);
  }
  return [String(value), CONFIDENCE_HIGH];
}
