"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { LANDING_FREEZE_BOOT_SCRIPT } from "./landing-freeze";

/**
 * Injects the freeze overlay script into the SSR HTML stream without rendering
 * a `<script>` in the client React tree (React 19 warns and skips those).
 */
export function LandingFreezeBoot() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        id="landing-freeze-boot"
        // Compile-time IIFE, not user input. Inline is required so the freeze
        // overlay paints before hydration without a client-rendered <script>.
        // eslint-disable-next-line no-restricted-syntax -- landing freeze boot
        dangerouslySetInnerHTML={{ __html: LANDING_FREEZE_BOOT_SCRIPT }}
      />
    );
  });
  return null;
}
