/**
 * Who-we / About landing — labels and inline image list (furnishes_v2: content.ts + images.ts).
 */

import {
  HERO_IMAGE_JON,
  LANDING_BANNER_3,
  LANDING_MAIN_1,
  LANDING_MAIN_4,
  LANDING_MAIN_5,
  LANDING_MAIN_6,
  LANDING_MAIN_7,
} from "@/content/site/about-images";

/** Brackets are styled in accent in `AboutWhoWe`; this is the inner label only. */
export const SECTION_WHO_ARE_WE = "WHO ARE WE";

/** Seven inline thumbnails — each uses a distinct file (not the home carousel slides). Slot 1 skips `landing-main-3` (large file; was failing to render in Next/Image). */
export const ABOUT_INLINE_IMAGES = [
  { src: LANDING_MAIN_1, alt: "Sunlit interior living space" },
  { src: HERO_IMAGE_JON, alt: "Open plan with natural light" },
  { src: LANDING_MAIN_4, alt: "Warm wood and soft seating" },
  { src: LANDING_MAIN_5, alt: "Calm bedroom or retreat" },
  { src: LANDING_MAIN_6, alt: "Dining and gathering area" },
  { src: LANDING_MAIN_7, alt: "Detail and texture" },
  { src: LANDING_BANNER_3, alt: "Wide architectural view" },
] as const;
