"use client";

/** Account canvas peach — must match `--canvas` in account-studio.css. */
const ACCOUNT_PAGE_BG = "#fff2e5";

/**
 * Document-level paint while Account is mounted:
 * - html/body match the studio canvas so touch/trackpad overscroll
 *   does not flash the default white page behind the app;
 * - lock document scrolling so only inner panes (chat, rail, preferences) move;
 * - clamp overscroll rubber-banding on the document.
 */
export function AccountDocumentPaint() {
  return (
    <style>{`
      html, body {
        background-color: ${ACCOUNT_PAGE_BG} !important;
        height: 100%;
        overflow: hidden;
        overscroll-behavior: none;
      }
    `}</style>
  );
}
