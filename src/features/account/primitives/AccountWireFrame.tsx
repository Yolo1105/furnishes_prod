import type { ReactNode } from "react";

/**
 * Route-owned wireframe stage wrapper — mirrors approved Account `.wireview` /
 * `.wf-vmain` mount used for non-chat, non-dashboard Account views.
 * Pass `inspector` to enable the prototype sticky side panel (`.wf-split`).
 */
export function AccountWireFrame({
  children,
  inspector,
}: {
  children: ReactNode;
  inspector?: ReactNode;
}) {
  return (
    <div
      className={inspector ? "wireview wf-split" : "wireview"}
      style={{ display: "flex" }}
    >
      <div className="wf-vmain">{children}</div>
      {inspector}
    </div>
  );
}
