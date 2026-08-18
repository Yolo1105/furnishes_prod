import { z } from "zod";

export const TITLE_MAX = 200;
const PROMPT_MAX = 4000;

export const createStudioPieceSchema = z
  .object({
    imageGenerationId: z.string().cuid().optional(),
    prompt: z.string().trim().min(1).max(PROMPT_MAX).optional(),
    title: z.string().trim().max(TITLE_MAX).optional(),
    sourcePieceId: z.string().cuid().optional(),
    projectId: z.string().cuid().optional(),
  })
  .superRefine((value, ctx) => {
    const hasGeneration = Boolean(value.imageGenerationId);
    const hasPrompt = Boolean(value.prompt);
    if (hasGeneration === hasPrompt) {
      ctx.addIssue({
        code: "custom",
        message: "Provide either imageGenerationId or prompt.",
        path: ["imageGenerationId"],
      });
    }
  });

export const patchStudioPieceSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
});
