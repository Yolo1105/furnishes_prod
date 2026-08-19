"use client";

/**
 * Document-level styles that live only while `/` (the Landing) is mounted.
 * Orange html/body paint waits until the house is on screen — applying it
 * earlier is the full red-orange flash before WebGL.
 */
export function LandingDocumentPaint({ active = true }: { active?: boolean }) {
  return (
    <style>{`
      html, body {
        ${active ? "background-color: #e83200 !important;" : ""}
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; width: 0; height: 0; }
    `}</style>
  );
}
