import type { ChatPreferenceCategory } from "./preference-types";

const ROOM_ALIASES: Record<string, string> = {
  living: "living room",
  "living room": "living room",
  livingroom: "living room",
  bedroom: "bedroom",
  "master bedroom": "bedroom",
  kitchen: "kitchen",
  dining: "dining room",
  "dining room": "dining room",
  office: "home office",
  "home office": "home office",
  bathroom: "bathroom",
  studio: "studio",
  "open plan": "open plan",
  "open-plan": "open plan",
};

const STYLE_ALIASES: Record<string, string> = {
  modern: "modern",
  minimal: "minimalist",
  minimalist: "minimalist",
  scandi: "scandinavian",
  scandinavian: "scandinavian",
  japandi: "japandi",
  industrial: "industrial",
  "mid century": "mid-century",
  "mid-century": "mid-century",
  mcm: "mid-century",
  boho: "bohemian",
  bohemian: "bohemian",
  coastal: "coastal",
  traditional: "traditional",
  rustic: "rustic",
  contemporary: "contemporary",
  maximalist: "maximalist",
  maximal: "maximalist",
};

const GENERIC_VALUES = new Set([
  "color palette",
  "palette",
  "style",
  "budget",
  "furniture",
  "room",
  "colors",
  "color",
  "design",
  "help",
  "ideas",
  "tips",
  "mood image",
  "floorplan",
  "lighting ideas",
  "minimalist tips",
  "favorite colors",
  "favorite color",
  "paint colors",
  "wall colors",
  "materials to consider",
  "space-saving furniture",
  "space saving furniture",
  "textiles and patterns",
  "indoor plants",
]);

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePreferenceValue(
  category: ChatPreferenceCategory,
  raw: string,
): string | null {
  let value = collapseWhitespace(raw).toLowerCase();
  if (!value) return null;

  if (category === "room") {
    value = ROOM_ALIASES[value] ?? value;
  } else if (category === "style") {
    value = STYLE_ALIASES[value] ?? value;
  } else if (category === "budget") {
    value = value
      .replace(/usd|sgd|\$/gi, (m) => m.toUpperCase())
      .replace(/\s*,\s*/g, ",")
      .replace(/\s+/g, " ");
    // Keep currency readable but compact
    value = value.replace(/\$\s+/g, "$");
  } else if (category === "furniture") {
    value = value
      .split(",")
      .map((part) => collapseWhitespace(part))
      .filter(Boolean)
      .join(", ");
  } else if (category === "color") {
    value = value.replace(/\s+/g, " ");
  }

  if (!value || GENERIC_VALUES.has(value)) return null;
  return value.slice(0, 120);
}
