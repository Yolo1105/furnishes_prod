"use client";

import styles from "./landing.module.css";

/** Neutral grain overlay. `filterId` must be unique per instance on the page. */
export function LandingGrain({
  filterId,
  className,
}: {
  filterId: string;
  className?: string | undefined;
}) {
  return (
    <svg
      className={className ?? styles.grainFill}
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

/** Warm orange fleck grain for cream surfaces. */
export function LandingWarmGrain({
  filterId,
  className,
}: {
  filterId: string;
  className?: string | undefined;
}) {
  return (
    <svg
      className={className ?? styles.grainFillWarm}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <filter id={filterId} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="2"
          stitchTiles="stitch"
          result="n"
        />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.86
                  0 0 0 0 0.39
                  0 0 0 0 0.08
                  0.5 0.5 0.5 0 -0.82"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}
