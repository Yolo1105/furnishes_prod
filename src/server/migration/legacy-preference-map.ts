import type { ChatPreferenceCategory } from "@/server/preferences/preference-types";
import { isChatPreferenceCategory } from "@/server/preferences/preference-types";

/**
 * Map legacy PreferenceGroup + free-text field (or conversation Preference.field)
 * onto the five Account memory categories.
 */
export function mapLegacyPreferenceCategory(input: {
  group?: string | null;
  field: string;
}): ChatPreferenceCategory | null {
  const field = input.field.trim().toLowerCase();
  const group = (input.group ?? "").trim().toLowerCase();

  const looksColor =
    field.includes("color") ||
    field.includes("palette") ||
    field.includes("colour");

  if (looksColor) return "color";

  if (
    field.includes("budget") ||
    field.includes("price") ||
    field.includes("cost") ||
    group === "budget"
  ) {
    return "budget";
  }

  if (
    field.includes("room") ||
    field.includes("space") ||
    field === "mainroom" ||
    group === "room"
  ) {
    return "room";
  }

  if (
    field.includes("furniture") ||
    field.includes("must") ||
    field.includes("material") ||
    field.includes("piece") ||
    group === "musthaves" ||
    group === "materials"
  ) {
    return "furniture";
  }

  if (
    field.includes("style") ||
    field.includes("aesthetic") ||
    field.includes("mood") ||
    field.includes("vibe") ||
    group === "style"
  ) {
    return "style";
  }

  if (isChatPreferenceCategory(field)) return field;

  return null;
}
