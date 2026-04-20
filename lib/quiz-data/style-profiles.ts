import type { StyleKey } from "./types";

// ─── Style profiles ───────────────────────────────────────────────────────────

export const STYLE_PROFILES: Record<
  StyleKey,
  {
    name: string;
    tagline: string;
    description: string;
    palette: string[];
    keywords: string[];
  }
> = {
  minimal: {
    name: "THE QUIETIST",
    tagline: "Less is a decision, not a default.",
    description:
      "You believe a room should breathe. Every object earns its place. You live with restraint not from austerity but from intention. The edit is the art.",
    palette: ["#DDD5C4", "#B09470", "#8A9E9A"],
    keywords: ["WHITE SPACE", "NEGATIVE FORM", "PURE MATERIAL", "SILENCE"],
  },
  maximalist: {
    name: "THE COLLECTOR",
    tagline: "A room should tell the whole story.",
    description:
      "More is never too much. It is the point. You layer texture, memory, and color until a room becomes a world. You believe in the beautiful accumulation of a life fully lived.",
    palette: ["#B33D0E", "#B09470", "#DDD5C4"],
    keywords: ["ABUNDANCE", "LAYERED", "NARRATIVE", "WARMTH"],
  },
  organic: {
    name: "THE NATURALIST",
    tagline: "Living things are the best furniture.",
    description:
      "A room is an ecosystem. You bring the outside in: raw clay, rough linen, trailing green, warm light filtered through leaves. Your spaces feel like they were always there.",
    palette: ["#6B7355", "#B09470", "#DDD5C4"],
    keywords: ["EARTH", "TEXTURE", "GROWTH", "WARMTH"],
  },
  industrial: {
    name: "THE STRUCTURALIST",
    tagline: "Honest material. Honest form.",
    description:
      "You respect what things are made of. Exposed structure isn't unfinished. It is the design. You trust steel, wood, concrete. You want to see how a room holds itself up.",
    palette: ["#6B7355", "#8A9E9A", "#B09470"],
    keywords: ["STRUCTURE", "RAW EDGE", "FUNCTION", "PERMANENCE"],
  },
  artisan: {
    name: "THE MAKER",
    tagline: "The hand is always visible.",
    description:
      "You live among things that were shaped by someone. Craft is not ornament. It is evidence. Every object in your space carries the mark of its making and the weight of skill.",
    palette: ["#B09470", "#6B7355", "#DDD5C4"],
    keywords: ["CRAFT", "HANDMADE", "PATINA", "TRADITION"],
  },
};
