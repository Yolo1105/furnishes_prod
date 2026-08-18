/**
 * Damped page scroll — same feel as FurnishesApp.jsx ("smooth with a touch of lag").
 *
 * Wheel nudges a target (`t`); a rAF loop eases an internal position (`y`) toward
 * it with lerp 0.13, so motion coasts after input stops. Side-nav jumps set the
 * same target so free scroll and section clicks share one motion model.
 */
import { landingScroll } from "./landing-scroll-state";

const LERP = 0.13;
const SETTLE_PX = 0.4;

type ScrollState = {
  y: number;
  t: number;
  raf: number;
  active: boolean;
};

let st: ScrollState | null = null;
let attached = false;

function scrollingElement() {
  return document.scrollingElement || document.documentElement;
}

function pageMax() {
  const doc = scrollingElement();
  return Math.max(0, doc.scrollHeight - doc.clientHeight);
}

function clamp(v: number, max: number) {
  return Math.max(0, Math.min(v, max));
}

function step() {
  if (!st) return;
  const doc = scrollingElement();
  st.t = clamp(st.t, pageMax());
  const d = st.t - st.y;
  if (Math.abs(d) > SETTLE_PX) {
    st.y += d * LERP;
    doc.scrollTop = st.y;
    landingScroll.active = true;
    st.raf = requestAnimationFrame(step);
    return;
  }
  st.y = st.t;
  doc.scrollTop = st.y;
  st.active = false;
  st.raf = 0;
  landingScroll.active = false;
}

function kick() {
  if (!st || st.active) return;
  st.active = true;
  landingScroll.active = true;
  st.raf = requestAnimationFrame(step);
}

/** Ease toward `y` (side-nav / menu / wordmark section jumps). */
export function setLandingScrollTarget(y: number) {
  if (!st) {
    window.scrollTo(0, y);
    return;
  }
  st.t = clamp(y, pageMax());
  kick();
}

function onWheel(event: WheelEvent) {
  if (!st) return;
  if (event.ctrlKey) return;
  if (pageMax() <= 0) return;
  event.preventDefault();
  const delta = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
  st.t = clamp(st.t + delta, pageMax());
  kick();
}

/** Scrollbar drag / keys / touch: adopt native position when we are idle. */
function onScrollSync() {
  if (!st || st.active) return;
  const top = scrollingElement().scrollTop;
  st.y = st.t = top;
}

/**
 * Attach damped wheel scrolling (fine pointer only).
 * Returns a disposer, or `null` when native scroll should be used instead
 * (touch / reduced-motion) so the host can own `landingScroll.active`.
 */
export function enableLandingDampedScroll(): (() => void) | null {
  if (attached) return () => undefined;
  if (typeof window === "undefined") return null;
  if (!window.matchMedia("(pointer: fine)").matches) return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }

  const doc = scrollingElement();
  attached = true;
  st = {
    y: doc.scrollTop,
    t: doc.scrollTop,
    raf: 0,
    active: false,
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScrollSync, { passive: true });

  return () => {
    attached = false;
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("scroll", onScrollSync);
    if (st?.raf) cancelAnimationFrame(st.raf);
    st = null;
    landingScroll.active = false;
  };
}
