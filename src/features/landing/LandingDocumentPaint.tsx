"use client";

/**
 * Document-level styles that live only while `/` (the Landing) is mounted.
 * Orange html/body overrides the peach handoff paint so login → home cannot
 * leave a blank cream document behind the stage.
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
