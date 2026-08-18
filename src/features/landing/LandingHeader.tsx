"use client";

import { forwardRef, type RefObject } from "react";
import { PublicHeader } from "@/components/public-shell";

type LandingHeaderProps = {
  menuOpen: boolean;
  scrolled: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  userLabel?: string | null;
  onToggleMenu: () => void;
  onHome: () => void;
};

/** Landing adapter — approved chrome lives in `components/public-shell`. */
export const LandingHeader = forwardRef<HTMLElement, LandingHeaderProps>(
  function LandingHeader({ userLabel = null, ...props }, ref) {
    return (
      <PublicHeader
        ref={ref}
        {...props}
        userLabel={userLabel}
        instant
        menuControlsId="landing-main-menu"
      />
    );
  },
);
