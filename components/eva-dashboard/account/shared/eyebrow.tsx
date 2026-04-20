import type { ReactNode } from "react";

/**
 * Editorial eyebrow label rendered as `[ LABEL ]` — brackets supplied by
 * CSS (.eyebrow::before / ::after in account-theme.css).
 *
 * Pass RAW text:  <Eyebrow>STYLE PROFILE</Eyebrow>
 * NEVER pre-wrap:  <Eyebrow>STYLE PROFILE</Eyebrow>   // double brackets bug
 */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`eyebrow ${className}`}>{children}</span>;
}
