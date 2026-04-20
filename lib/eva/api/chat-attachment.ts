import { z } from "zod";

/** Client-reported lifecycle for structured attachments (Studio / chat UI). */
export const AttachmentClientReadinessSchema = z.enum([
  "uploaded",
  "analyzing",
  "ready",
  "failed",
  "unsupported",
]);

export type AttachmentClientReadiness = z.infer<
  typeof AttachmentClientReadinessSchema
>;

/** Structured attachment metadata — not pasted into the user message body. */
export const ChatAttachmentSchema = z.object({
  kind: z.enum(["image_url"]),
  url: z.string().url().max(2048),
  mimeType: z.string().max(120).optional(),
  label: z.string().max(200).optional(),
  /** Client lifecycle — server validates; missing treated as legacy `ready`. */
  clientReadiness: AttachmentClientReadinessSchema.optional(),
  /** Correlation id for UI only — echoed in logs when present. */
  localId: z.string().max(128).optional(),
  /** Persisted `File` row id after `/api/uploads/confirm` (provenance). */
  fileRecordId: z.string().max(128).optional(),
  /**
   * Optional user- or client-pipeline text (e.g. after a local analyzer).
   * Never treated as verified machine vision unless a future server stage sets a dedicated flag.
   */
  analysisSummary: z.string().max(8000).optional(),
});

export type ChatAttachmentPayload = z.infer<typeof ChatAttachmentSchema>;

export const ClientSurfaceSchema = z.enum([
  "default",
  "studio_rail",
  "chatbot",
]);

export type ClientSurface = z.infer<typeof ClientSurfaceSchema>;

/** Use with `studioSnapshot` — enforced server-side. */
export const CLIENT_SURFACE_STUDIO_RAIL: ClientSurface = "studio_rail";
