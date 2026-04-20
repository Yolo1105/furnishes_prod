/**
 * Types for the lightweight 3D “room preview” in Studio (not the Eva layout-planner domain).
 */

/** `@react-three/drei` `Environment` preset names used by `RoomFurnitureScene`. */
export type RoomDreiEnvironmentPreset =
  | "studio"
  | "sunset"
  | "night"
  | "warehouse";

/** One placed GLB in the room canvas (key correlates with `FilmRow.key`). */
export type RoomPlacement = { key: string; glbUrl: string };
