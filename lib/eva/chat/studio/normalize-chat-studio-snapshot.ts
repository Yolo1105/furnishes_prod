import {
  CLIENT_SURFACE_STUDIO_RAIL,
  type ClientSurface,
} from "@/lib/eva/api/chat-attachment";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import {
  parseStudioSnapshot,
  type StudioSnapshotPayload,
} from "@/lib/eva/studio/studio-snapshot-schema";

export type NormalizeChatStudioSnapshotResult =
  | { ok: true; studioSnapshotPayload: StudioSnapshotPayload | null }
  | { ok: false; response: Response };

/**
 * Validates optional `studioSnapshot` against `clientSurface` and returns a typed payload.
 */
export function normalizeChatStudioSnapshotForPost(args: {
  rawStudioSnapshot: unknown | undefined;
  clientSurface: ClientSurface | undefined;
}): NormalizeChatStudioSnapshotResult {
  const { rawStudioSnapshot, clientSurface } = args;
  if (rawStudioSnapshot === undefined) {
    return { ok: true, studioSnapshotPayload: null };
  }
  if (clientSurface !== CLIENT_SURFACE_STUDIO_RAIL) {
    return {
      ok: false,
      response: apiError(
        ErrorCodes.VALIDATION_ERROR,
        `studioSnapshot requires clientSurface ${CLIENT_SURFACE_STUDIO_RAIL}`,
        400,
      ),
    };
  }
  const snapshotParse = parseStudioSnapshot(rawStudioSnapshot);
  if (!snapshotParse.success) {
    return {
      ok: false,
      response: apiError(ErrorCodes.VALIDATION_ERROR, snapshotParse.error, 400),
    };
  }
  return { ok: true, studioSnapshotPayload: snapshotParse.data };
}
