/**
 * Local images under `public/images/` for Style Explorer image grids.
 * Consumed in order so placeholders rarely repeat until the pool wraps.
 */
export const STYLE_EXPLORER_IMAGE_POOL = [
  "/images/landing-main-1.jpg",
  "/images/landing-main-2.jpg",
  "/images/landing-main-3.jpg",
  "/images/landing-main-4.jpg",
  "/images/landing-main-5.jpg",
  "/images/landing-main-6.jpg",
  "/images/landing-main-7.jpg",
  "/images/landing-banner.jpg",
  "/images/landing-banner-1.jpg",
  "/images/landing-banner-2.jpg",
  "/images/landing-banner-3.jpg",
  "/images/landing-banner-4.jpg",
  "/images/landing-banner-unused-1.jpg",
  "/images/landing-banner-unused-2.jpg",
  "/images/hero/markus-spiske-OOZxVR65q3c-unsplash.jpg",
  "/images/hero/jon-stebbe-paydk0JcIOQ-unsplash.jpg",
  "/images/hero/lute-Fv5GnGntvcg-unsplash.jpg",
] as const;

export function styleExplorerGridImage(index: number): string {
  return STYLE_EXPLORER_IMAGE_POOL[index % STYLE_EXPLORER_IMAGE_POOL.length];
}
