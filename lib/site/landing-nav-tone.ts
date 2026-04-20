/**
 * Header: light while #About’s top is still below the fixed <header>’s bottom edge.
 * Sidebar: light on Home. Dark when #About overlaps the sidenav or after Home has scrolled away.
 * (Rail is lifted above `#site-footer`, so no footer-based light flip.)
 */
export function getHeaderNavTone(
  firstSectionIdForFallback?: string,
): "light" | "dark" {
  const about = document.getElementById("About");
  const headerEl = document.querySelector("header");
  const headerBottom = headerEl?.getBoundingClientRect().bottom ?? 72;

  if (about) {
    const aboutTop = about.getBoundingClientRect().top;
    return aboutTop > headerBottom ? "light" : "dark";
  }

  const hero = firstSectionIdForFallback
    ? document.getElementById(firstSectionIdForFallback)
    : null;
  if (!hero) return "dark";
  const rect = hero.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight ? "light" : "dark";
}

export function getSidebarNavTone(
  firstSectionIdForFallback?: string,
): "light" | "dark" {
  const nav = document.querySelector('nav[aria-label="Section"]');
  const about = document.getElementById("About");
  const home = document.getElementById("Home");
  if (nav && about && home) {
    const r = nav.getBoundingClientRect();
    const a = about.getBoundingClientRect();
    const h = home.getBoundingClientRect();
    const overlapsAbout = a.top < r.bottom && a.bottom > r.top;
    const pastHome = h.bottom <= 0;
    if (overlapsAbout || pastHome) return "dark";
    return "light";
  }
  return getHeaderNavTone(firstSectionIdForFallback);
}
