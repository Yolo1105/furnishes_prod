/**
 * Field ids and labels (server-only). Uses `getDomainConfig`.
 */
import { getDomainConfig } from "./config";

const DEFAULT_FIELD_IDS = [
  "roomType",
  "style",
  "budget",
  "color",
  "furniture",
  "exclusion",
] as const;

const FALLBACK_LABELS: Record<string, string> = {
  roomType: "room type",
  style: "design style",
  designStyle: "design style",
  budget: "budget",
  budgetRange: "budget",
  color: "color",
  colorTheme: "colors",
  furniture: "furniture",
  furnitureLayout: "layout",
  exclusion: "exclusion",
};

export function getFieldIds(): string[] {
  const fields = getDomainConfig().fields;
  if (fields?.length) return fields.map((f) => f.id);
  return [...DEFAULT_FIELD_IDS];
}

export function getFieldLabel(fieldId: string): string {
  const field = getDomainConfig().fields?.find((f) => f.id === fieldId);
  if (field?.label) return field.label;
  return FALLBACK_LABELS[fieldId] ?? fieldId;
}
