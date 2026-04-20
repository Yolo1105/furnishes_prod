import type { ArrangeRoomShapeId } from "@/types/arrange-room";
import type { GenerationQuality, MeshModelId } from "@/types/generation";
import type { RoomDreiEnvironmentPreset } from "@/types/room";

export type ModelId = MeshModelId;

export type QualityTier = GenerationQuality;

export type StudioTab = "generate" | "arrange";

export type EnvPreset = "morning" | "studio" | "golden" | "night" | "clean";

export const MODEL_META: Record<
  ModelId,
  { name: string; tag: string; ms: number; cost: number; meta: string }
> = {
  hunyuan3d: {
    name: "Hunyuan3D",
    tag: "HNY",
    ms: 4000,
    cost: 0.055,
    meta: "Best textures · ~45s",
  },
  meshy: {
    name: "Meshy",
    tag: "MSH",
    ms: 5000,
    cost: 0.08,
    meta: "Cleanest topology · ~60s",
  },
  triposr: {
    name: "TripoSR",
    tag: "TRP",
    ms: 2000,
    cost: 0.01,
    meta: "Fastest, open source · ~10s",
  },
  stable3d: {
    name: "Stable3D",
    tag: "S3D",
    ms: 3000,
    cost: 0.04,
    meta: "Trellis on Fal · ~30–90s",
  },
};

export const MODEL_IDS: ModelId[] = [
  "hunyuan3d",
  "meshy",
  "triposr",
  "stable3d",
];

/** Short labels for quality tier chips (hints carry the longer copy). */
export const QUALITY_LABELS: Record<QualityTier, string> = {
  fast: "Fast",
  balanced: "Balanced",
  high: "High",
};

export const QUALITY_HINTS: Record<QualityTier, string> = {
  fast: "Fast — rough preview. Lower-poly mesh, quick to iterate.",
  balanced:
    "Balanced — recommended. Studio-grade mesh and textures at a sensible cost.",
  high: "High — detailed mesh, heavier textures. Longer wait, worth it for hero shots.",
};

/** Account Studio route: generation + room placement. */
export const ACCOUNT_IMAGE_GEN_HREF = "/account/image-gen" as const;

/** Search param for deep-linking Studio tabs (`/account/image-gen?tab=…`). */
export const STUDIO_URL_TAB_QUERY = "tab" as const;

/** `searchParams.tab` value that opens the Arrange (room) tab. */
export const STUDIO_ARRANGE_TAB_VALUE = "arrange" as const;

/** Same route as `ACCOUNT_IMAGE_GEN_HREF`, Arrange tab open (room preview). */
export const ACCOUNT_IMAGE_GEN_ARRANGE_HREF =
  `${ACCOUNT_IMAGE_GEN_HREF}?${STUDIO_URL_TAB_QUERY}=${STUDIO_ARRANGE_TAB_VALUE}` as const;

/** Prompt chips for the Generate rail (shared copy). */
export const PROMPT_EXAMPLES: readonly string[] = [
  "Mid-century walnut lounge chair with cream bouclé upholstery, tapered legs",
  "Minimal white oak bookshelf, five shelves, matte finish",
  "Sculptural side table in cast bronze with a round glass top",
  "Compact L-shaped sectional in warm grey linen, low profile",
];

export const ENVIRONMENT_HINTS: Record<EnvPreset, string> = {
  morning: "Currently: Morning — warm soft light from the east.",
  studio:
    "Currently: Studio — neutral even fill. Closest to a reference render.",
  golden: "Currently: Golden hour — long warm shadows, low sun angle.",
  night: "Currently: Night — warm lamp pools, deep shadows, cool ambient.",
  clean:
    "Currently: Clean — flat white, no shadows. Good for comparing shapes.",
};

export const ENVIRONMENT_TINT: Record<
  EnvPreset,
  { floorA: string; floorB: string; wall: string }
> = {
  morning: { floorA: "#d4c5b0", floorB: "#a08860", wall: "#f5ede0" },
  studio: { floorA: "#e8dcc5", floorB: "#b8a890", wall: "#ffffff" },
  golden: { floorA: "#e8c89a", floorB: "#a07040", wall: "#f5d9b0" },
  night: { floorA: "#4a3e30", floorB: "#1e1612", wall: "#2a1f18" },
  clean: { floorA: "#ffffff", floorB: "#ebe0d0", wall: "#ffffff" },
};

/** UI iteration order for environment chips (explicit so it does not depend on object key order). */
export const ENV_PRESET_ORDER: EnvPreset[] = [
  "morning",
  "studio",
  "golden",
  "night",
  "clean",
];

/** Arrange tab — floor shape presets (width/depth seeds in meters). */
export const ARRANGE_SHAPE_PRESETS: readonly {
  id: ArrangeRoomShapeId;
  w: string;
  d: string;
  label: string;
  dim: string;
}[] = [
  { id: "square", w: "4.0", d: "4.0", label: "Square", dim: "4 × 4 m" },
  { id: "wide", w: "5.0", d: "3.0", label: "Wide", dim: "5 × 3 m" },
  { id: "tall", w: "3.0", d: "5.0", label: "Tall", dim: "3 × 5 m" },
  { id: "l", w: "4.5", d: "4.5", label: "L-shape", dim: "Custom" },
];

export const QUALITY_ORDER: QualityTier[] = ["fast", "balanced", "high"];

/** Maps Arrange env chips → `@react-three/drei` `Environment` preset names. */
export function envDreiPreset(env: EnvPreset): RoomDreiEnvironmentPreset {
  switch (env) {
    case "morning":
      return "sunset";
    case "studio":
      return "studio";
    case "golden":
      return "sunset";
    case "night":
      return "night";
    case "clean":
      return "warehouse";
    default:
      return "studio";
  }
}
