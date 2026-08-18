"use client";

import Link from "next/link";
import { forwardRef, type ReactNode, type RefObject } from "react";
import styles from "./public-shell.module.css";

type PublicHeaderProps = {
  menuOpen: boolean;
  scrolled: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  menuControlsId?: string;
  loginHref?: string;
  /** When signed in, replaces login with a borderless greeting. */
  userLabel?: string | null;
  accountHref?: string;
  /**
   * Optional trailing control (e.g. a future overlay control). When set, replaces the
   * default Login link so Landing stays unchanged when omitted.
   */
  endAction?: ReactNode;
  /** Skip Menu/Login entrance animation (loader → landing handoff). */
  instant?: boolean;
  onToggleMenu: () => void;
  onHome: () => void;
};

function HeaderGrain({ filterId }: { filterId: string }) {
  return (
    <svg
      className={styles.headerGrain}
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

export const PublicHeader = forwardRef<HTMLElement, PublicHeaderProps>(
  function PublicHeader(
    {
      menuOpen,
      scrolled,
      menuButtonRef,
      menuControlsId = "public-main-menu",
      loginHref = "/login",
      userLabel = null,
      accountHref = "/account",
      endAction,
      instant = false,
      onToggleMenu,
      onHome,
    },
    ref,
  ) {
    const signedInLabel = userLabel?.trim() || null;
    return (
      <header
        ref={ref}
        className={`${styles.header}${scrolled ? ` ${styles.headerSolid}` : ""}${menuOpen ? ` ${styles.headerMenuOpen}` : ""}${instant ? ` ${styles.headerInstant}` : ""}`}
        data-menu-open={menuOpen ? "true" : "false"}
      >
        <HeaderGrain filterId="public-topbar-grain" />
        <button
          ref={menuButtonRef}
          className={styles.headerAction}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={menuControlsId}
          onClick={onToggleMenu}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
        <button className={styles.wordmark} type="button" onClick={onHome}>
          furnishes.
        </button>
        {endAction ??
          (signedInLabel ? (
            <Link className={styles.headerGreeting} href={accountHref}>
              Hello, {signedInLabel}
            </Link>
          ) : (
            <Link className={styles.headerButton} href={loginHref}>
              login
            </Link>
          ))}
      </header>
    );
  },
);
