import type { MeshModelId } from "@/types/generation";

export type StudioPieceListItem = {
  id: string;
  title: string;
  prompt: string;
  quality: {
    tier?: string;
    imageQuality?: string;
    meshQuality?: string;
    meshModel?: string;
  };
  status: string;
  providerImageUrl: string | null;
  providerGlbUrl: string | null;
  storedImageUrl: string | null;
  storedGlbUrl: string | null;
  sourcePieceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function meshModelFromPieceQuality(
  q: StudioPieceListItem["quality"],
): MeshModelId {
  const m = q.meshModel;
  if (
    m === "hunyuan3d" ||
    m === "meshy" ||
    m === "triposr" ||
    m === "stable3d"
  ) {
    return m;
  }
  return "hunyuan3d";
}
