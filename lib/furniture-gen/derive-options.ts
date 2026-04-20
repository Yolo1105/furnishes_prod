import type { GenerateOptions, MeshModelId } from "@/types/generation";
import {
  MODEL_IDS,
  type ModelId,
  type QualityTier,
} from "@/components/eva-dashboard/account/image-gen/constants";

/** First selected model in catalog order — drives which Fal mesh endpoint runs. */
export function pickPrimaryModel(models: Set<ModelId>): MeshModelId {
  for (const id of MODEL_IDS) {
    if (models.has(id)) return id;
  }
  return "hunyuan3d";
}

/**
 * Map Studio UI quality + model checkboxes → pipeline image/mesh quality + mesh backend.
 */
export function deriveGenerateOptions(
  quality: QualityTier,
  models: Set<ModelId>,
): GenerateOptions {
  const imageQuality: GenerateOptions["imageQuality"] =
    quality === "fast" ? "fast" : quality === "high" ? "high" : "balanced";

  const ids = Array.from(models);
  let meshQuality: GenerateOptions["meshQuality"] =
    quality === "fast" ? "fast" : quality === "high" ? "high" : "balanced";

  if (ids.length === 1 && ids[0] === "triposr") {
    meshQuality = "fast";
  } else if (
    ids.includes("triposr") &&
    !ids.some((m) => m === "hunyuan3d" || m === "meshy" || m === "stable3d")
  ) {
    meshQuality = "fast";
  }

  const meshModel = pickPrimaryModel(models);

  return { imageQuality, meshQuality, meshModel };
}
