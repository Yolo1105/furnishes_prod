import { SECTION_WHO_ARE_WE } from "@/content/site/about-hero";

/** Sidebar + scroll-spy: stable `id` matches `document.getElementById`; `label` is what the rail shows. */
export const LANDING_SECTIONS = [
  { id: "Home", label: "Home" },
  { id: "About", label: SECTION_WHO_ARE_WE },
  { id: "Experience", label: "Experience" },
  { id: "Design", label: "Design" },
  { id: "Material", label: "Material" },
  { id: "Heritage", label: "Heritage" },
] as const;

export const LANDING_SECTION_IDS = LANDING_SECTIONS.map((s) => s.id);

export type LandingSectionId = (typeof LANDING_SECTIONS)[number]["id"];
