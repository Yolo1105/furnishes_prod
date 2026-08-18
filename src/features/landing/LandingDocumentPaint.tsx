"use client";

const LANDING_PAGE_BG = "#e83200";

/**
 * Document-level styles that live only while `/` (the Landing) is mounted:
 * - paint html/body the hero-band orange to prevent white flash;
 * - hide scrollbars for the Landing's cinematic scroll (scrolling itself
 *   still works). Scoped here — NOT in globals.css — so future surfaces
 *   (Account chat, tables, panels) keep normal scrollbars.
 */
export function LandingDocumentPaint() {
  return (
    <style>{`
      html, body { background-color: ${LANDING_PAGE_BG} !important; }
      html, body { scrollbar-width: none; -ms-overflow-style: none; }
      html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; width: 0; height: 0; }
    `}</style>
  );
}
