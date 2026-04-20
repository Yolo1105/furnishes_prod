/**
 * Shared types for the furniture text → image → mesh pipeline (server + client).
 */

export type GenerationQuality = "fast" | "balanced" | "high";

/** Mesh backend ids — must stay aligned with Studio UI model checkboxes and Fal routes. */
export type MeshModelId = "hunyuan3d" | "meshy" | "triposr" | "stable3d";

/**
 * SSE payloads emitted by `generate()` and `/api/furniture/generate`.
 * Order: expanding → image_ready → meshing → done | error.
 */
export type Progress =
  | { stage: "expanding"; message: string }
  | { stage: "image_ready"; imageUrl: string }
  | { stage: "meshing"; message: string }
  | { stage: "done"; imageUrl: string; glbUrl: string }
  /** Emitted after durable DB + optional R2 ingest — prefer URLs here over `done`. */
  | {
      stage: "artifact_ready";
      pieceId: string;
      title: string;
      imageUrl: string;
      glbUrl: string;
      providerImageUrl: string;
      providerGlbUrl: string;
      sourcePieceId: string | null;
    }
  | { stage: "error"; message: string };

/** Options passed from the API / UI into `lib/furniture-gen/pipeline.generate`. */
export type GenerateOptions = {
  meshQuality?: GenerationQuality;
  imageQuality?: GenerationQuality;
  meshModel?: MeshModelId;
};
