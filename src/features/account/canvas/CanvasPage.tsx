"use client";

import { Studio } from "@studio/studio/Studio";
import { selectCurrentProject, useStore } from "@studio/store";
import { CanvasDocumentPaint } from "./CanvasDocumentPaint";
import "./playground/playground.css";

/**
 * Account Canvas — full standalone playground (same shell as reference).
 * Covers the viewport; Account rail and stage chrome are not mounted.
 */
export function CanvasPage({ className }: { className?: string }) {
  const seeded = useStore((s) => s.seeded);
  const projectName = useStore((s) => selectCurrentProject(s).name);
  return (
    <>
      <CanvasDocumentPaint />
      <div
        className={["furnishes-canvas-playground", className]
          .filter(Boolean)
          .join(" ")}
        data-canvas-playground="1"
        data-canvas-project={projectName}
        data-canvas-ready={seeded ? "1" : "0"}
      >
        <div className="bg-fluid" aria-hidden="true">
          <div className="bg-blob bg-blob-1" />
          <div className="bg-blob bg-blob-2" />
          <div className="bg-blob bg-blob-3" />
        </div>
        <Studio />
      </div>
    </>
  );
}
