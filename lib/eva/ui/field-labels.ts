/**
 * Client-safe labels for preference field ids (mirrors server `FALLBACK_LABELS` in domain/fields).
 */
const LABELS: Record<string, string> = {
  roomType: "Room type",
  style: "Design style",
  designStyle: "Design style",
  budget: "Budget",
  budgetRange: "Budget",
  color: "Color",
  colorTheme: "Colors",
  furniture: "Furniture",
  furnitureLayout: "Layout",
  exclusion: "Avoid",
  roomWidth: "Room width (ft)",
  roomLength: "Room length (ft)",
  roomDimensions: "Room dimensions",
};

export function fieldLabel(fieldId: string): string {
  return LABELS[fieldId] ?? fieldId;
}
