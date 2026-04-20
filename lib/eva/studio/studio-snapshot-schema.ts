import { z } from "zod";

/** Validated Studio rail snapshot — sent only from Studio image-gen chat. */
const RoomBlockSchema = z.object({
  roomType: z.string().max(80).optional(),
  width: z.string().max(48).optional(),
  length: z.string().max(48).optional(),
  height: z.string().max(48).optional(),
  openings: z.array(z.string().max(160)).max(16).optional(),
});

const DesignIntentBlockSchema = z.object({
  prompt: z.string().max(12000),
  styleTags: z.array(z.string().max(64)).max(32),
  budget: z.string().max(320).optional(),
  constraints: z.array(z.string().max(240)).max(40),
});

const SceneBlockSchema = z.object({
  placedItems: z.array(z.string().max(200)).max(48),
  selectedLayoutOption: z.string().max(200).optional(),
  materials: z.array(z.string().max(80)).max(24),
  colors: z.array(z.string().max(80)).max(24),
});

const AssetImageRefSchema = z.object({
  id: z.string().max(128),
  label: z.string().max(200).optional(),
  /** Stable or public URL when available — not embedded in user message text. */
  url: z.string().max(2048).optional(),
});

const AssetsBlockSchema = z.object({
  referenceImages: z.array(AssetImageRefSchema).max(24),
  generatedImages: z.array(AssetImageRefSchema).max(48),
  selectedImageId: z.string().max(128).optional(),
});

export const StudioSnapshotSchema = z.object({
  activeProjectId: z.string().nullable(),
  /** Human-readable when available — helps the model without leaking ids alone. */
  projectTitle: z.string().max(240).optional(),
  room: RoomBlockSchema,
  designIntent: DesignIntentBlockSchema,
  scene: SceneBlockSchema,
  assets: AssetsBlockSchema,
  lastUserActions: z.array(z.string().max(200)).max(24),
});

export type StudioSnapshotPayload = z.infer<typeof StudioSnapshotSchema>;

export function parseStudioSnapshot(
  raw: unknown,
):
  | { success: true; data: StudioSnapshotPayload }
  | { success: false; error: string } {
  const parsed = StudioSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().formErrors.join("; ") || "invalid snapshot",
    };
  }
  return { success: true, data: parsed.data };
}
