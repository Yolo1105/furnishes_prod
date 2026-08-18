import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

/** Shown only when CANVAS_PLAYGROUND_ENABLED=0. */
export function CanvasPlaceholder() {
  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Canvas"
        title="Canvas"
        subtitle="Place furniture, orbit the room, and try layouts before you buy."
      />
      <div className="wf-blank wf-blank--stage" aria-label="3D canvas">
        <p className="wf-blank__kicker">Coming soon</p>
        <p className="wf-blank__t">3D room visualizer</p>
        <p className="wf-blank__p">
          Orbit the room, drag pieces, and save a view back to your project.
        </p>
      </div>
    </AccountWireFrame>
  );
}
