/**
 * Shared hero image paths — about page, awards, team, blog, and home About block.
 * Home carousel uses only `MAIN_LANDING_IMAGES` in `landing-main-images.ts`; do not reuse those four paths below the fold.
 *
 * Extra `/images/landing-*` files here are for sections below the hero so each slot can use a distinct photo.
 */

export const HERO_IMAGE_MARKUS =
  "/images/hero/markus-spiske-OOZxVR65q3c-unsplash.jpg";
export const HERO_IMAGE_LUTE = "/images/hero/lute-Fv5GnGntvcg-unsplash.jpg";
export const HERO_IMAGE_JON =
  "/images/hero/jon-stebbe-paydk0JcIOQ-unsplash.jpg";

/** Not in `MAIN_LANDING_IMAGES` — use for About inline / Experience / Services instead of repeating carousel slides. */
export const LANDING_MAIN_1 = "/images/landing-main-1.jpg";
export const LANDING_MAIN_3 = "/images/landing-main-3.jpg";
export const LANDING_MAIN_4 = "/images/landing-main-4.jpg";
export const LANDING_MAIN_5 = "/images/landing-main-5.jpg";
export const LANDING_MAIN_6 = "/images/landing-main-6.jpg";
export const LANDING_MAIN_7 = "/images/landing-main-7.jpg";
export const LANDING_BANNER_3 = "/images/landing-banner-3.jpg";
export const LANDING_BANNER_UNUSED_1 = "/images/landing-banner-unused-1.jpg";
export const LANDING_BANNER_UNUSED_2 = "/images/landing-banner-unused-2.jpg";
export const LANDING_BANNER_DEFAULT = "/images/landing-banner.jpg";

/** First two images — about page intro grid (matches furnishes_v2). */
export const ABOUT_PAGE_INTRO_IMAGES = [
  { src: HERO_IMAGE_LUTE, alt: "Modern living room" },
  { src: HERO_IMAGE_JON, alt: "Cozy interior" },
] as const;

export const ABOUT_AWARDS_BANNER_IMAGE = HERO_IMAGE_LUTE;

export const ABOUT_TEAM_IMAGE = { src: HERO_IMAGE_JON, alt: "Furnishes team" };
