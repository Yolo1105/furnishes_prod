"use client";

import type { ReactNode } from "react";

export function PersonaButton({
  children,
  onClick,
  buttonRef,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="wf-eva__swap"
      aria-label="Change Eva persona"
      title="Change Eva persona"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
