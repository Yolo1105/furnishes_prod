/**
 * Static style archetype catalog (product content). Used by Style Profile compare UI.
 */
import type { StyleProfile } from "@/lib/site/account/types";

export const ALL_STYLE_PROFILES: StyleProfile[] = [
  {
    key: "minimal",
    name: "The Quietist",
    tagline: "Less is a decision, not a default.",
    description:
      "You believe a room should breathe. Every object earns its place. You live with restraint — not from austerity, but from intention. The edit is the art.",
    palette: ["#DDD5C4", "#B09470", "#8A9E9A", "#F5F0E6", "#2E2A26"],
    keywords: ["WHITE SPACE", "NEGATIVE FORM", "PURE MATERIAL", "SILENCE"],
  },
  {
    key: "maximalist",
    name: "The Collector",
    tagline: "A room should tell the whole story.",
    description:
      "More is never too much. It is the point. You layer texture, memory, and color until a room becomes a world. You believe in the beautiful accumulation of a life fully lived.",
    palette: ["#B33D0E", "#B09470", "#DDD5C4", "#5C2E1E", "#E8C66C"],
    keywords: ["ABUNDANCE", "LAYERED", "NARRATIVE", "WARMTH"],
  },
  {
    key: "organic",
    name: "The Naturalist",
    tagline: "Living things are the best furniture.",
    description:
      "A room is an ecosystem. You bring the outside in: raw clay, rough linen, trailing green, warm light filtered through leaves. Your spaces feel like they were always there.",
    palette: ["#6B7355", "#B09470", "#DDD5C4", "#3D4A30", "#D9C9A3"],
    keywords: ["EARTH", "TEXTURE", "GROWTH", "WARMTH"],
  },
  {
    key: "industrial",
    name: "The Structuralist",
    tagline: "Honest material. Honest form.",
    description:
      "You respect what things are made of. Exposed structure isn't unfinished — it is the design. You trust steel, wood, concrete. You want to see how a room holds itself up.",
    palette: ["#6B7355", "#8A9E9A", "#B09470", "#2B2B2B", "#C9C2B6"],
    keywords: ["STRUCTURE", "RAW EDGE", "FUNCTION", "PERMANENCE"],
  },
  {
    key: "artisan",
    name: "The Maker",
    tagline: "The hand is always visible.",
    description:
      "You live among things shaped by someone. Craft is not ornament — it is evidence. Every object in your space carries the mark of its making and the weight of skill.",
    palette: ["#B09470", "#6B7355", "#DDD5C4", "#7A3E1A", "#E3D4B8"],
    keywords: ["CRAFT", "HANDMADE", "PATINA", "TRADITION"],
  },
];

const DIFFERS: Record<string, string> = {
  minimal:
    "Where you bring life in, the Quietist edits it out. Shared restraint, different goal.",
  maximalist:
    "You layer natural textures; the Collector layers stories. Both warm, differently loud.",
  industrial:
    "You soften rooms with living materials; Structuralists leave structure exposed.",
  artisan:
    "You favor what grows; Makers favor what's shaped. Both honor hand and process.",
};

export type StyleArchetype = StyleProfile & {
  differs: string;
};

export function getStyleArchetypes(): StyleArchetype[] {
  return ALL_STYLE_PROFILES.map((p) => ({
    ...p,
    differs:
      DIFFERS[p.key] ??
      "A different answer to the same question: how should a room feel?",
  }));
}

/** Shown when the user has not completed the style quiz — not a real profile row. */
export const EMPTY_STYLE_PROFILE: StyleProfile = {
  key: "minimal",
  name: "No style profile yet",
  tagline: "Take the Style Explorer to anchor recommendations.",
  description:
    "Once you complete the quiz, Eva stores your design language here — palette, keywords, and the story behind your taste.",
  palette: ["#E8E4DE", "#C9C2B6", "#A39E96", "#7A756E", "#5C5852"],
  keywords: ["NOT SET"],
};
