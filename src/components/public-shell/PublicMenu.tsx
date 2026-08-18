"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./public-shell.module.css";

/**
 * Surface-parameterized navigation tokens. The shell never imports
 * surface-owned types; callers pass their destination union via generics.
 */

/** Built-in chrome CTAs always emit these tokens; surfaces must accept them. */
export type PublicMenuChromeDestination = "work" | "studio";

export type PublicMenuLink = {
  label: string;
  href: string | null;
  enabled: boolean;
};

export type PublicMenuWorkItem<TDestination extends string = string> = {
  label: string;
  destination: TDestination;
};

export type PublicMenuStudioItem<TDestination extends string = string> = {
  label: string;
  destination: TDestination;
  tag?: string;
};

export type PublicMenuNavItem<TDestination extends string = string> = {
  ix: string;
  label: string;
  destination: TDestination;
  active: boolean;
};

type PublicMenuProps<TDestination extends string> = {
  open: boolean;
  menuId?: string;
  email: string;
  workItems: ReadonlyArray<PublicMenuWorkItem<TDestination>>;
  studioItems: ReadonlyArray<PublicMenuStudioItem<TDestination>>;
  navItems: ReadonlyArray<PublicMenuNavItem<TDestination>>;
  socialLinks: ReadonlyArray<PublicMenuLink>;
  onClose: () => void;
  onNavigate: (destination: TDestination | PublicMenuChromeDestination) => void;
};

function MenuGrain({ filterId }: { filterId: string }) {
  return (
    <svg
      className={styles.menuGrain}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <filter id={filterId} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}

function focusablesIn(el: HTMLElement | null) {
  if (!el) return [];
  return Array.from(
    el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => !node.hasAttribute("disabled") && node.tabIndex !== -1);
}

export function PublicMenu<TDestination extends string>({
  open,
  menuId = "public-main-menu",
  email,
  workItems,
  studioItems,
  navItems,
  socialLinks,
  onClose,
  onNavigate,
}: PublicMenuProps<TDestination>) {
  const menuRef = useRef<HTMLDivElement>(null);
  const grainId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const first = focusablesIn(menuRef.current)[0];
    if (first) {
      requestAnimationFrame(() => first.focus());
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusablesIn(menuRef.current);
      if (items.length < 2) return;
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      ref={menuRef}
      className={`${styles.menu}${open ? ` ${styles.menuOpen}` : ""}`}
      id={menuId}
      role="dialog"
      aria-modal={open}
      aria-label="Main menu"
      aria-hidden={!open}
      {...(!open ? { inert: true } : {})}
    >
      <MenuGrain filterId={`public-menu-grain-${grainId}`} />

      <div className={styles.menuWrap}>
        <div className={styles.menuGrid}>
          <div className={styles.menuVline} aria-hidden="true" />

          <div className={styles.menuLeft}>
            <div className={`${styles.menuBlock} ${styles.menuReveal}`}>
              <div>
                <p className={styles.menuEyebrow}>[ Work ]</p>
                <p className={styles.menuHeading}>Projects</p>
                <button
                  type="button"
                  className={styles.menuCta}
                  onClick={() => onNavigate("work")}
                >
                  <span className={styles.menuCtaText}>See all work</span>
                  <span className={styles.menuCtaArrow} aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
              <div className={styles.menuItems}>
                {workItems.map((item, i) => (
                  <div
                    key={item.label}
                    className={`${styles.menuItemRow} ${styles.menuReveal}`}
                    style={{ transitionDelay: `${0.08 + i * 0.04}s` }}
                  >
                    <button
                      type="button"
                      className={styles.menuListItem}
                      onClick={() => onNavigate(item.destination)}
                    >
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`${styles.menuBlock} ${styles.menuBlockStudio} ${styles.menuReveal}`}
              style={{ transitionDelay: "0.18s" }}
            >
              <div>
                <p className={styles.menuEyebrow}>[ Studio ]</p>
                <p className={styles.menuHeading}>Furnishes</p>
                <button
                  type="button"
                  className={styles.menuCta}
                  onClick={() => onNavigate("studio")}
                >
                  <span className={styles.menuCtaText}>About the studio</span>
                  <span className={styles.menuCtaArrow} aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
              <div className={styles.menuItems}>
                {studioItems.map((item, i) => (
                  <div
                    key={item.label}
                    className={`${styles.menuItemRow} ${styles.menuReveal}`}
                    style={{ transitionDelay: `${0.22 + i * 0.04}s` }}
                  >
                    <button
                      type="button"
                      className={styles.menuListItem}
                      onClick={() => onNavigate(item.destination)}
                    >
                      {item.label}
                    </button>
                    {item.tag ? (
                      <span className={styles.menuTag}>{item.tag}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.menuRight}>
            {navItems.map((item, i) => (
              <button
                key={item.label}
                type="button"
                className={`${styles.menuNav}${item.active ? ` ${styles.menuNavActive}` : ""} ${styles.menuReveal}`}
                style={{ transitionDelay: `${0.12 + i * 0.05}s` }}
                onClick={() => onNavigate(item.destination)}
              >
                <span className={styles.menuNavIx}>{item.ix}</span>
                {item.label}
              </button>
            ))}

            <p
              className={`${styles.menuEyebrow} ${styles.menuConnect} ${styles.menuReveal}`}
              style={{ transitionDelay: "0.42s" }}
            >
              [ Connect ]
            </p>
            {socialLinks.map((item, i) =>
              item.enabled && item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  className={`${styles.menuNav} ${styles.menuSub} ${styles.menuReveal}`}
                  style={{ transitionDelay: `${0.46 + i * 0.04}s` }}
                  onClick={onClose}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  key={item.label}
                  className={`${styles.menuNav} ${styles.menuSub} ${styles.menuSubDisabled} ${styles.menuReveal}`}
                  style={{ transitionDelay: `${0.46 + i * 0.04}s` }}
                  aria-disabled="true"
                >
                  {item.label}
                </span>
              ),
            )}
            <a
              className={`${styles.menuNav} ${styles.menuSub} ${styles.menuReveal}`}
              style={{ transitionDelay: "0.56s" }}
              href={`mailto:${email}`}
              onClick={onClose}
            >
              {email}
              <span className={styles.menuCnt} aria-hidden="true">
                [↗]
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
