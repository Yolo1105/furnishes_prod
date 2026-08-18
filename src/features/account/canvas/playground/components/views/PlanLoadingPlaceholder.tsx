"use client";

/** Shared empty-state while a viewer floor plan is seeding. */
export function PlanLoadingPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-app), system-ui, sans-serif",
        fontSize: compact ? 10 : 11,
        color: "rgba(26, 26, 26, 0.4)",
      }}
    >
      Loading plan…
    </div>
  );
}
