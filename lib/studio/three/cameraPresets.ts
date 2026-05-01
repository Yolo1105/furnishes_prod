/**
 * Camera presets used by the top bar's "Shuffle" action and as the
 * default starting view. Each preset is a `[position, target]` pair
 * in normalized scene units (the apartment has been normalized to
 * ~10m on its longest axis with the floor at y=0 and the X/Z
 * footprint centered at origin — see `lib/three/normalize.ts`).
 *
 * The first entry (index 0) is the default boot view and the target
 * for the Reset Camera action. The remaining entries are cinematic
 * variants the Shuffle button cycles through.
 *
 * Coordinates were tuned for the apartamento.glb in this repo; if
 * the GLB is swapped out, these may need to be re-tuned to keep the
 * apartment in frame.
 */
import type { Vector3Tuple } from "three";

export interface CameraPreset {
  /** Camera world position. */
  position: Vector3Tuple;
  /** OrbitControls target — the point the camera looks at. */
  target: Vector3Tuple;
  /** Short label for debugging / future UI. */
  label: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    // v0.40.42: pulled in from [8, 7, 8] to [5.5, 4.5, 5.5]. The
    // previous distance was tuned for the wide apartamento.glb but
    // looked oddly remote for a single generated room (a 5×6m space
    // appeared as a small block in the corner of the viewport).
    // Tighter framing makes the room feel like the subject.
    label: "Default",
    position: [5.5, 4.5, 5.5],
    target: [0, 1, 0],
  },
  {
    label: "Front raised",
    position: [0, 4.5, 7.5],
    target: [0, 1, 0],
  },
  {
    label: "Far corner low",
    position: [6.5, 2.5, 6.5],
    target: [0, 1.2, 0],
  },
  {
    label: "Top-down",
    position: [0.5, 11, 0.5],
    target: [0, 0, 0],
  },
  {
    label: "Side wide",
    position: [8, 3.5, 0],
    target: [0, 1.2, 0],
  },
  {
    label: "Back low",
    position: [-5, 2.5, -5],
    target: [0, 1.2, 0],
  },
];
