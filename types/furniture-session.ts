/**
 * Client-side Studio session state for the image-gen workspace (filmstrip, phases).
 */

import type { MeshModelId } from "@/types/generation";

/** UI pipeline steps mapped from SSE `Progress.stage`. */
export type PipelinePhase =
  | "idle"
  | "running-1"
  | "running-2"
  | "running-3"
  | "done";

export type FilmRowStatus = "generating" | "done" | "error";

/** One generation run in the results strip (solo view + room picker). */
export type FilmRow = {
  key: string;
  badge: number;
  model: MeshModelId;
  status: FilmRowStatus;
  variant: number;
  imageUrl?: string;
  glbUrl?: string;
  /** Durable piece id after server persistence (`artifact_ready`). */
  pieceId?: string;
  /** Provider URLs before R2 ingest — optional for debugging / fallback. */
  providerImageUrl?: string;
  providerGlbUrl?: string;
  /** Stable URLs after R2 copy (when available). */
  storedImageUrl?: string;
  storedGlbUrl?: string;
  /** Lineage: parent piece for “new variation”. */
  sourcePieceId?: string | null;
  /** Short title from server piece record. */
  pieceTitle?: string;
  errorMessage?: string;
  /** Prompt text at completion time — used in Arrange “Your pieces” labels. */
  promptSnapshot?: string;
};
