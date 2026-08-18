/** Injected quiz stylesheet (keyframes + interaction feedback). */

export const QUIZ_CSS = `
.style-explorer-root {
  /* Matches the Furnishes site: Space Mono for labels/details, Archivo for display.
     next/font CSS variables take priority when the quiz runs inside the app. */
  font-family: var(--font-space-mono, 'Space Mono'), 'Space Mono', ui-monospace, 'Cascadia Mono', 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  -webkit-font-smoothing: antialiased;
  min-height: 100dvh;
}
.style-explorer-root h1,
.style-explorer-root .q-display {
  font-family: var(--font-archivo, 'Archivo'), 'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-stretch: 112%;
  letter-spacing: 0 !important;
}
.style-explorer-root .q-interstitial-title {
  font-family: var(--font-archivo, 'Archivo'), 'Archivo', ui-sans-serif, system-ui, sans-serif;
  font-stretch: 112%;
}
.style-explorer-root * { box-sizing: border-box; }
.style-explorer-root .q-vh { min-height: 100vh; min-height: 100dvh; }
/* Brand selection color instead of system blue */
.style-explorer-root ::selection { background: #B33D0E; color: #DDD5C4; }
/* Kill the grey mobile tap flash; keep scroll chains inside the quiz */
.style-explorer-root { -webkit-tap-highlight-color: transparent; overscroll-behavior: contain; }
/* Native control leaks: spinner arrows off, textarea handle constrained */
.style-explorer-root input[type="number"]::-webkit-inner-spin-button,
.style-explorer-root input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.style-explorer-root input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
.style-explorer-root textarea { resize: vertical; }
/* iOS zooms the viewport when a focused input's font-size < 16px */
@media (max-width: 768px) {
  .style-explorer-root input,
  .style-explorer-root textarea,
  .style-explorer-root select { font-size: 16px !important; }
}
/* Narrow screens: pending/done chapters collapse to their number so the
   three stepper columns never overflow */
@media (max-width: 640px) {
  .style-explorer-root .q-step .q-step-name { letter-spacing: 0.12em; }
  .style-explorer-root .q-step:not([data-state="active"]) .q-step-name { display: none; }
  .style-explorer-root .q-step .q-step-count { letter-spacing: 0.04em; }
}
/* No visible scrollbars anywhere — scrolling still works */
html, body { scrollbar-width: none; -ms-overflow-style: none; }
html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0; height: 0; display: none; }
.style-explorer-root, .style-explorer-root * { scrollbar-width: none; -ms-overflow-style: none; }
.style-explorer-root::-webkit-scrollbar, .style-explorer-root *::-webkit-scrollbar { width: 0; height: 0; display: none; }
.style-explorer-root button { font-family: inherit; }
.style-explorer-root h1, .style-explorer-root p { margin: 0; }

@keyframes style-explorer-fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.style-explorer-root .quiz-enter {
  animation: style-explorer-fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.style-explorer-root .writing-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
/* Staggered entrance for option lists — delay set inline per index */
.style-explorer-root .q-stagger {
  opacity: 0;
  animation: style-explorer-fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
/* Selection pop */
/* Flow interstitial */
@keyframes style-explorer-wipe {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
@keyframes style-explorer-tracking {
  from { letter-spacing: 0.6em; opacity: 0; }
  to   { letter-spacing: 0.1em; opacity: 1; }
}
.style-explorer-root .q-interstitial-bg {
  transform-origin: top;
  animation: style-explorer-wipe 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.style-explorer-root .q-interstitial-title {
  animation: style-explorer-tracking 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
}
/* Swipe deck */
/* Results reveal */
.style-explorer-root .q-reveal {
  opacity: 0;
  animation: style-explorer-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes style-explorer-stamp {
  0% { transform: scale(1.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.style-explorer-root .q-stamp { animation: style-explorer-stamp 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .style-explorer-root .quiz-enter,
  .style-explorer-root .q-stagger,
  .style-explorer-root .q-interstitial-bg,
  .style-explorer-root .q-interstitial-title,
  .style-explorer-root .q-reveal,
  .style-explorer-root .q-stamp { animation: none; opacity: 1; }
}
/* ── Universal interaction feedback (transitions + pseudo-classes, no keyframes) ── */
.style-explorer-root button { transition: transform 0.12s ease, filter 0.15s ease, opacity 0.2s ease; }
.style-explorer-root button:active:not(:disabled) { transform: scale(0.96); }
.style-explorer-root [role="radio"]:not([aria-checked="true"]):hover,
.style-explorer-root [role="checkbox"]:not([aria-checked="true"]):hover { filter: brightness(1.18); }
.style-explorer-root [role="radio"][aria-checked="true"],
.style-explorer-root [role="checkbox"][aria-checked="true"] { filter: brightness(1.05); }
.style-explorer-root button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.style-explorer-root input[type="range"] { -webkit-appearance: none; appearance: none; }
.style-explorer-root input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 14px; height: 14px; border-radius: 0;
  background: currentColor; cursor: pointer;
  transition: transform 0.15s ease;
}
.style-explorer-root input[type="range"]:hover::-webkit-slider-thumb { transform: scale(1.25); }
.style-explorer-root input[type="range"]:active::-webkit-slider-thumb { transform: scale(1.45); }
.style-explorer-root input[type="range"]::-moz-range-thumb {
  width: 14px; height: 14px; border: none; border-radius: 0;
  background: currentColor; cursor: pointer;
}
`;
