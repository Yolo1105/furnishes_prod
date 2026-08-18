"use client";

import type { ReactNode } from "react";
import { PublicFooter, type PublicFooterContent } from "./PublicFooter";
import {
  PublicMenu,
  type PublicMenuChromeDestination,
  type PublicMenuNavItem,
  type PublicMenuStudioItem,
  type PublicMenuWorkItem,
  type PublicMenuLink,
} from "./PublicMenu";
import styles from "./public-shell.module.css";

type PublicShellProps<TDestination extends string> = {
  /** Stays outside the content inert region so Menu/Close remains usable. */
  header: ReactNode;
  children: ReactNode;
  /**
   * Portals outside inert page content (e.g. a future overlay drawer). Renders
   * after header + content so overlays stay keyboard-accessible.
   */
  overlay?: ReactNode;
  /** Make page content + footer inert (e.g. while an overlay is open). */
  contentInert?: boolean;
  /** Make header controls inert (e.g. while an overlay is open). */
  headerInert?: boolean;
  menuOpen: boolean;
  menuId?: string;
  email: string;
  workItems: ReadonlyArray<PublicMenuWorkItem<TDestination>>;
  studioItems: ReadonlyArray<PublicMenuStudioItem<TDestination>>;
  navItems: ReadonlyArray<PublicMenuNavItem<TDestination>>;
  socialLinks: ReadonlyArray<PublicMenuLink>;
  footer: PublicFooterContent;
  footerGridClassName?: string;
  onCloseMenu: () => void;
  onNavigate: (destination: TDestination | PublicMenuChromeDestination) => void;
};

/**
 * Outer public chrome: Menu, Header, then page content + Footer.
 * Content is inert while the Menu is open or `contentInert` is set.
 * Overlays render outside those inert regions.
 */
export function PublicShell<TDestination extends string>({
  header,
  children,
  overlay,
  contentInert = false,
  headerInert = false,
  menuOpen,
  menuId = "public-main-menu",
  email,
  workItems,
  studioItems,
  navItems,
  socialLinks,
  footer,
  footerGridClassName,
  onCloseMenu,
  onNavigate,
}: PublicShellProps<TDestination>) {
  const pageInert = menuOpen || contentInert;

  return (
    <div className={styles.shell}>
      <PublicMenu
        open={menuOpen}
        menuId={menuId}
        email={email}
        workItems={workItems}
        studioItems={studioItems}
        navItems={navItems}
        socialLinks={socialLinks}
        onClose={onCloseMenu}
        onNavigate={onNavigate}
      />
      <div {...(headerInert ? { inert: true } : {})}>{header}</div>
      <div {...(pageInert ? { inert: true } : {})}>
        {children}
        <PublicFooter
          content={footer}
          {...(footerGridClassName
            ? { gridClassName: footerGridClassName }
            : {})}
        />
      </div>
      {overlay}
    </div>
  );
}
