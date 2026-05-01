// AI response schemas. The model returns JSON matching ResponseZ;
// any deviation is rejected at the validation layer in the route
// handler before the response reaches the client.
//
// Adapted from the zip's lib/ai/schema.ts. The schema describes the
// FULL action surface the AI can produce — even though our current
// store only supports `delete` and `setVisibility` actions today
// (no x/z/rotation on items yet), the schema includes move /
// rotate / duplicate so the model has a complete vocabulary. The
// client-side action applier silently no-ops the actions our slice
// can't apply yet; when later phases add positioned items, the same
// schema starts producing useful actions without re-prompting.

import { z } from "zod";

export const MoveActionZ = z.object({
  type: z.literal("move"),
  id: z.string(),
  x: z.number(),
  z: z.number(),
});

export const RotateActionZ = z.object({
  type: z.literal("rotate"),
  id: z.string(),
  rotation: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
});

export const DeleteActionZ = z.object({
  type: z.literal("delete"),
  id: z.string(),
});

export const DuplicateActionZ = z.object({
  type: z.literal("duplicate"),
  id: z.string(),
  offsetX: z.number().optional().default(0.3),
  offsetZ: z.number().optional().default(0.3),
});

export const SetVisibilityActionZ = z.object({
  type: z.literal("setVisibility"),
  id: z.string(),
  visible: z.boolean(),
});

/** Discriminated union of every action the model can emit. The
 *  `type` field is the discriminator. */
export const ActionZ = z.discriminatedUnion("type", [
  MoveActionZ,
  RotateActionZ,
  DeleteActionZ,
  DuplicateActionZ,
  SetVisibilityActionZ,
]);

/** Full response shape. `reply` is the user-facing one-line
 *  acknowledgement; `actions` is the executable plan. */
export const ResponseZ = z.object({
  reply: z.string().min(1).max(500),
  actions: z.array(ActionZ).max(20),
});

export type AIAction = z.infer<typeof ActionZ>;
export type AIResponse = z.infer<typeof ResponseZ>;
