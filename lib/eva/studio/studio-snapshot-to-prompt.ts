import type { StudioSnapshotPayload } from "@/lib/eva/studio/studio-snapshot-schema";

/**
 * Compact, human-readable grounding block — not a raw JSON dump.
 */
export function studioSnapshotToPromptBlock(
  snapshot: StudioSnapshotPayload,
): string {
  const lines: string[] = [];
  lines.push("Studio context (current session):");
  if (snapshot.projectTitle) {
    lines.push(`- Project: ${snapshot.projectTitle}`);
  }
  if (snapshot.activeProjectId) {
    lines.push(`- Project id: ${snapshot.activeProjectId}`);
  } else {
    lines.push("- No active project selected.");
  }

  const { room } = snapshot;
  const roomBits = [
    room.roomType ? `shape/type: ${room.roomType}` : null,
    room.width ? `width: ${room.width}` : null,
    room.length ? `length/depth: ${room.length}` : null,
    room.height ? `height: ${room.height}` : null,
  ].filter(Boolean);
  if (roomBits.length) {
    lines.push(`- Room: ${roomBits.join("; ")}`);
  }

  const di = snapshot.designIntent;
  if (di.prompt.trim()) {
    lines.push(
      `- User prompt: ${di.prompt.length > 600 ? `${di.prompt.slice(0, 600)}…` : di.prompt}`,
    );
  }
  if (di.styleTags.length) {
    lines.push(`- Tags: ${di.styleTags.join(", ")}`);
  }
  if (di.budget) {
    lines.push(`- Budget note: ${di.budget}`);
  }
  if (di.constraints.length) {
    lines.push(`- Constraints: ${di.constraints.join(" | ")}`);
  }

  const sc = snapshot.scene;
  if (sc.placedItems.length) {
    lines.push(
      `- Placed items: ${sc.placedItems.slice(0, 20).join(", ")}${sc.placedItems.length > 20 ? "…" : ""}`,
    );
  }
  if (sc.selectedLayoutOption) {
    lines.push(`- Layout selection: ${sc.selectedLayoutOption}`);
  }
  if (sc.materials.length) {
    lines.push(`- Materials: ${sc.materials.join(", ")}`);
  }
  if (sc.colors.length) {
    lines.push(`- Colors: ${sc.colors.join(", ")}`);
  }

  const { assets } = snapshot;
  const refCount = assets.referenceImages.filter((x) => x.url).length;
  if (refCount > 0) {
    lines.push(
      `- Reference imagery: ${refCount} image URL(s) available in assets (use for grounding; do not invent pixels).`,
    );
  }
  if (assets.generatedImages.length) {
    lines.push(
      `- Generated strip: ${assets.generatedImages.length} result(s); selected: ${assets.selectedImageId ?? "none"}.`,
    );
  }

  if (snapshot.lastUserActions.length) {
    lines.push(`- Recent actions: ${snapshot.lastUserActions.join(" → ")}`);
  }

  return lines.join("\n");
}
