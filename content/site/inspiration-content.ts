/** Inspiration hub — bento grid tools (aligned with furnishes_v2) */

import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";

export type InspirationToolCategory = "Discover" | "Plan" | "Create";
export type InspirationTool = {
  id: number;
  title: string;
  tagline: string;
  description: string;
  route: string;
  category: InspirationToolCategory;
  image: string;
};

export const INSPIRATION_TOOLS: InspirationTool[] = [
  {
    id: 1,
    title: "Style Explorer",
    tagline: "Find your aesthetic",
    description:
      "Browse curated palettes of materials, textures, and moods. Save the ones that feel like you and let them guide every choice that follows.",
    route: WORKFLOW_ROUTES.style,
    category: "Discover",
    image: "/images/landing-banner-1.jpg",
  },
  {
    id: 2,
    title: "Budget Planner",
    tagline: "Spend where it counts",
    description:
      "Set a total, allocate by room, and see exactly where every dollar lands. Prioritize the pieces that transform a space and trim the rest.",
    route: WORKFLOW_ROUTES.budget,
    category: "Plan",
    image: "/images/landing-main-5.jpg",
  },
  {
    id: 3,
    title: "AI Assistant",
    tagline: "Your personal design advisor",
    description:
      "Describe your space, your lifestyle, your taste. Get tailored recommendations backed by real inventory and design principles.",
    route: WORKFLOW_ROUTES.assistant,
    category: "Discover",
    image: "/images/landing-main-2.jpg",
  },
  {
    id: 4,
    title: "Design Quiz",
    tagline: "3 minutes to clarity",
    description:
      "Answer a few questions about how you live and we will map your taste to a style profile, complete with starter pieces and color direction.",
    route: WORKFLOW_ROUTES.quiz,
    category: "Discover",
    image: "/images/landing-main-4.jpg",
  },
];

/**
 * Intro headline segments — same pattern as `ABOUT_INTRO_HEADLINE_PARTS` (accent via `highlight`).
 * Renders: Ideas that stay **grounded**: discover, plan, and shape your room.
 */
export const INSPIRATION_INTRO_HEADLINE_PARTS = [
  { text: "Tools that turn " },
  { text: "inspiration", highlight: true },
  { text: " into rooms you actually live in." },
] as const;

export const INSPIRATION_INTRO_HEADLINE = INSPIRATION_INTRO_HEADLINE_PARTS.map(
  (p) => p.text,
).join("");

/** One line under the inspiration headline (matches about intro tagline styling). */
export const INSPIRATION_INTRO_SUBLINE =
  "Explore by category or pick a tool. Each path leads to a room that feels like yours.";
export const INSPIRATION_FILTER_ALL = "All";
export const INSPIRATION_EMPTY_MESSAGE = "No tools found for this category.";

const INSPIRATION_CATEGORY_ORDER: InspirationToolCategory[] = [
  "Discover",
  "Plan",
  "Create",
];

/** Filter tabs: All + categories that appear in `INSPIRATION_TOOLS` (stable order). */
export const INSPIRATION_FILTER_CATEGORIES: readonly (
  | InspirationToolCategory
  | "All"
)[] = [
  INSPIRATION_FILTER_ALL,
  ...INSPIRATION_CATEGORY_ORDER.filter((c) =>
    INSPIRATION_TOOLS.some((t) => t.category === c),
  ),
];
