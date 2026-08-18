"use client";

/** Playground cream — matches standalone `layout.tsx` and playground.css. */
const CANVAS_PAGE_BG = "#fff4e3";

/**
 * Document-level paint while Canvas playground is mounted.
 * Same contract as standalone studio: lock scroll, cream backdrop.
 */
export function CanvasDocumentPaint() {
  return (
    <style>{`
      html, body {
        background-color: ${CANVAS_PAGE_BG} !important;
        height: 100%;
        width: 100%;
        overflow: hidden;
        overscroll-behavior: none;
      }
    `}</style>
  );
}
