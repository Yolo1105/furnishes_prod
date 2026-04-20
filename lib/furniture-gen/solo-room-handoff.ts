/**
 * Optional sessionStorage handoff for GLB URLs between Studio tabs (e.g. Generate ↔ Arrange).
 * No backend.
 */

export const SOLO_ROOM_HANDOFF_KEY = "furnishes.soloRoomHandoff.v1";

export type SoloRoomHandoffPayload = {
  glbUrl: string;
  imageUrl?: string;
  savedAt: number;
};

export function writeSoloRoomHandoff(
  payload: Pick<SoloRoomHandoffPayload, "glbUrl" | "imageUrl"> & {
    savedAt?: number;
  },
): void {
  if (typeof window === "undefined") return;
  const data: SoloRoomHandoffPayload = {
    glbUrl: payload.glbUrl,
    imageUrl: payload.imageUrl,
    savedAt: payload.savedAt ?? Date.now(),
  };
  sessionStorage.setItem(SOLO_ROOM_HANDOFF_KEY, JSON.stringify(data));
}

/** Returns payload once and clears storage so the same handoff is not applied twice. */
export function consumeSoloRoomHandoff(): SoloRoomHandoffPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SOLO_ROOM_HANDOFF_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(SOLO_ROOM_HANDOFF_KEY);
  try {
    const j = JSON.parse(raw) as SoloRoomHandoffPayload;
    if (typeof j?.glbUrl !== "string" || !j.glbUrl) return null;
    if (typeof j.savedAt !== "number") j.savedAt = Date.now();
    return j;
  } catch {
    return null;
  }
}
