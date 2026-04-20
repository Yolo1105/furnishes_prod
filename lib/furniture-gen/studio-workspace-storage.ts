import type { MeshModelId } from "@/types/generation";
import type { FilmRow } from "@/types/furniture-session";
import type {
  EnvPreset,
  ModelId,
  QualityTier,
  StudioTab,
} from "@/components/eva-dashboard/account/image-gen/constants";
import type { ArrangeCameraMode } from "@/types/arrange-room";

const STORAGE_KEY = "eva-furniture-studio-workspace:v1";

export type StudioWorkspaceSnapshotV1 = {
  v: 1;
  tab: StudioTab;
  prompt: string;
  quality: QualityTier;
  models: ModelId[];
  activeKey: string;
  filmRows: FilmRow[];
  arrange: {
    roomShapeId: string;
    roomWidthStr: string;
    roomDepthStr: string;
    environment: EnvPreset;
    placedPieceKeys: string[];
    cameraMode: ArrangeCameraMode;
    selectedPieceId: string | null;
  };
};

export function loadStudioWorkspace(): StudioWorkspaceSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { v?: number }).v === 1
    ) {
      return parsed as StudioWorkspaceSnapshotV1;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveStudioWorkspace(snapshot: StudioWorkspaceSnapshotV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export function clearStudioWorkspace(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildSnapshot(args: {
  tab: StudioTab;
  prompt: string;
  quality: QualityTier;
  models: Set<ModelId>;
  activeKey: string;
  filmRows: FilmRow[];
  arrange: StudioWorkspaceSnapshotV1["arrange"];
}): StudioWorkspaceSnapshotV1 {
  return {
    v: 1,
    tab: args.tab,
    prompt: args.prompt,
    quality: args.quality,
    models: Array.from(args.models),
    activeKey: args.activeKey,
    filmRows: args.filmRows,
    arrange: args.arrange,
  };
}

export { STORAGE_KEY };

/** Coerce JSON from API / storage into FilmRow (mesh model fallback). */
export function normalizeFilmRow(r: FilmRow): FilmRow {
  const model = r.model as MeshModelId;
  const safeModel: MeshModelId =
    model === "hunyuan3d" ||
    model === "meshy" ||
    model === "triposr" ||
    model === "stable3d"
      ? model
      : "hunyuan3d";
  return { ...r, model: safeModel };
}
