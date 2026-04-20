import type { StudioTab } from "@/components/eva-dashboard/account/image-gen/constants";
import type { FilmRow } from "@/types/furniture-session";
import type { StudioSnapshotPayload } from "@/lib/eva/studio/studio-snapshot-schema";

export type BuildStudioSnapshotArgs = {
  activeProjectId: string | null;
  activeProjectTitle: string | null;
  tab: StudioTab;
  prompt: string;
  filmRows: FilmRow[];
  activeFilmKey: string;
  arrangeRoomShapeLabel: string;
  roomWidthStr: string;
  roomDepthStr: string;
  placedPieceKeys: string[];
  selectedPieceId: string | null;
  environmentLabel: string;
  lastUserActions: string[];
};

/**
 * Maps live Studio workspace state into the validated snapshot shape.
 * Keeps strings bounded — server validates again with {@link StudioSnapshotSchema}.
 */
export function buildStudioSnapshotFromWorkspace(
  args: BuildStudioSnapshotArgs,
): StudioSnapshotPayload {
  const selectedRow =
    args.filmRows.find((r) => r.key === args.activeFilmKey) ??
    args.filmRows[args.filmRows.length - 1];

  const referenceImages = selectedRow
    ? [
        {
          id: selectedRow.key,
          label: selectedRow.pieceTitle ?? `Gen ${selectedRow.badge}`,
          url:
            selectedRow.storedImageUrl ??
            selectedRow.imageUrl ??
            selectedRow.providerImageUrl,
        },
      ]
    : [];

  const generatedImages = args.filmRows.map((row) => ({
    id: row.key,
    label: row.pieceTitle ?? `Result ${row.badge}`,
    url:
      row.storedImageUrl ?? row.imageUrl ?? row.providerImageUrl ?? undefined,
  }));

  const placedLabels = args.placedPieceKeys.map((key) => {
    const row = args.filmRows.find((r) => r.key === key);
    return row?.pieceTitle ?? key;
  });

  const styleTags: string[] = [];
  if (args.tab === "generate") styleTags.push("generate");
  if (args.tab === "arrange") styleTags.push("arrange");
  styleTags.push(args.environmentLabel);

  const constraints: string[] = [];
  if (args.tab === "arrange" && args.placedPieceKeys.length > 0) {
    constraints.push(
      `${args.placedPieceKeys.length} piece(s) placed in the room planner.`,
    );
  }

  return {
    activeProjectId: args.activeProjectId,
    projectTitle: args.activeProjectTitle?.trim() || undefined,
    room: {
      roomType: args.arrangeRoomShapeLabel || undefined,
      width: args.roomWidthStr,
      length: args.roomDepthStr,
      openings: undefined,
    },
    designIntent: {
      prompt: args.prompt.trim(),
      styleTags,
      budget: undefined,
      constraints,
    },
    scene: {
      placedItems: placedLabels,
      selectedLayoutOption:
        args.selectedPieceId != null
          ? `Selected piece: ${args.selectedPieceId}`
          : undefined,
      materials: [],
      colors: [],
    },
    assets: {
      referenceImages,
      generatedImages,
      selectedImageId: selectedRow?.key,
    },
    lastUserActions: args.lastUserActions.slice(-12),
  };
}
