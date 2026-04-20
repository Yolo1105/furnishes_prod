import type { ConversationArtifactKind } from "@/lib/eva-dashboard/conversation-output-types";

/**
 * Classify uploaded/linked files for preview and filtering (no fake metadata).
 */
export function classifyArtifact(
  mimeType: string | null | undefined,
  filename: string,
): ConversationArtifactKind {
  const m = (mimeType ?? "").toLowerCase();
  const base = filename.split(/[/\\]/).pop() ?? filename;
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf") return "pdf";
  if (/floor\s*plan|floorplan/i.test(base)) return "floorplan";
  if (
    m.startsWith("text/") ||
    m.includes("document") ||
    m.includes("msword") ||
    m.includes("wordprocessing") ||
    m.includes("spreadsheet")
  ) {
    return "document";
  }
  return "other";
}
