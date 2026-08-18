"use client";

import { useEffect, useState } from "react";
import { landingSideNav, scrollToLandingSection } from "./landing-navigation";
import styles from "./landing.module.css";

/**
 * Sticky left section rail: brackets the active section, shows a blurb,
 * hides at the footer. Dark/brown on Home + cream; light only at Contact.
 */
export function LandingSideNav({ activeSection }: { activeSection: string }) {
  const [atFooter, setAtFooter] = useState(false);

  useEffect(() => {
    const foot = document.getElementById("contact");
    if (!foot) return;
    const io = new IntersectionObserver(
      ([e]) => setAtFooter(Boolean(e?.isIntersecting)),
      { root: null, rootMargin: "0px 0px -30% 0px", threshold: 0 },
    );
    io.observe(foot);
    return () => io.disconnect();
  }, []);

  /* Dark/brown on Home and cream sections; light only at the footer. */
  const theme = activeSection === "contact" ? "light" : "dark";
  const hidden = atFooter || activeSection === "contact";

  return (
    <nav
      className={`${styles.sideNav} ${styles[`sideNav${theme === "light" ? "Light" : "Dark"}`]}${hidden ? ` ${styles.sideNavHidden}` : ""}`}
      aria-label="Section"
    >
      {landingSideNav.map(({ id, label, desc }) => {
        const on = activeSection === id;
        return (
          <div key={id} className={styles.sideNavItem}>
            <button
              type="button"
              className={styles.sideNavBtn}
              onClick={() => scrollToLandingSection(id)}
              aria-current={on ? "location" : undefined}
            >
              {on ? (
                <span className={styles.sideNavBk} aria-hidden="true">
                  [
                </span>
              ) : null}
              <span className={styles.sideNavLb} data-active={String(on)}>
                {label}
              </span>
              {on ? (
                <span className={styles.sideNavBk} aria-hidden="true">
                  ]
                </span>
              ) : null}
            </button>
            {on ? <p className={styles.sideNavDesc}>{desc}</p> : null}
          </div>
        );
      })}
    </nav>
  );
}
