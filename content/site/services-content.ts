import {
  HERO_IMAGE_JON,
  HERO_IMAGE_MARKUS,
  LANDING_BANNER_DEFAULT,
  LANDING_BANNER_UNUSED_1,
  LANDING_BANNER_UNUSED_2,
} from "@/content/site/about-images";

/** Inner text for `BracketedSectionLabel` in `MaterialSection` (orange brackets + primary text). */
export const SERVICES_SECTION_LABEL = "OUR SERVICES";

/** One-line heading below the label; accent segment uses `var(--color-accent)` in `MaterialSection`. */
export const SERVICES_SECTION_HEADING_PRIMARY = "CRAFTED ";
export const SERVICES_SECTION_HEADING_ACCENT = "INTERIORS";

/** Short intro under the main heading in `MaterialSection`. */
export const SERVICES_SECTION_INTRO =
  "Room refresh or full build: clear plans, trusted trades, spaces that feel easy to live in.";

/** Order matches `SERVICE_PREVIEW_IMAGES` (one image per row). */
export const SERVICES: { title: string; description: string; tag: string }[] = [
  {
    title: "Construction Management",
    description:
      "We coordinate contractors, suppliers, and inspections from walkthrough to punch list, flag clashes early, and keep updates and quality checks steady through handover.",
    tag: "Site to handover",
  },
  {
    title: "Interior Design Consultant",
    description:
      "We shape layout, materials, and fixtures to how you live, using samples so decisions stay clear. When code or budget push back, we adjust without losing the idea.",
    tag: "Clear choices",
  },
  {
    title: "Interior Space Planning",
    description:
      "We plan circulation, storage, and light before locking walls and joinery, balance privacy and flow, and leave room for services and future change.",
    tag: "Smart layout",
  },
  {
    title: "Sustainable Building Solutions",
    description:
      "We pick materials and systems that age well and suit your air quality goals, with efficient lighting, responsible timber, and reuse when it fits. Priorities are set early so green choices stay realistic on site.",
    tag: "Eco conscious",
  },
  {
    title: "Renovation and Remodeling",
    description:
      "We work with the structure and character you already have, phase the work cleanly, and run kitchens, baths, or whole home jobs from strip out to finish with clear scope and progress.",
    tag: "Thoughtful renewals",
  },
];

/** One image per service; order matches `SERVICES`. */
export const SERVICE_PREVIEW_IMAGES: { src: string; alt: string }[] = [
  { src: HERO_IMAGE_MARKUS, alt: "Interior build with coordinated trades" },
  { src: HERO_IMAGE_JON, alt: "Consultant with samples and layout notes" },
  {
    src: LANDING_BANNER_UNUSED_1,
    alt: "Living space with clear flow and storage",
  },
  { src: LANDING_BANNER_UNUSED_2, alt: "Natural materials in a calm interior" },
  {
    src: LANDING_BANNER_DEFAULT,
    alt: "Renovated room with new joinery and surfaces",
  },
];
