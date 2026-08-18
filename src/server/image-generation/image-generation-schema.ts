import { z } from "zod";

const DEFAULT_ALLOWED_SIZES = ["768x768", "1024x1024"] as const;

export function parseAllowedSizes(
  raw = process.env.IMAGE_GENERATION_ALLOWED_SIZES,
): Array<{ width: number; height: number; label: string }> {
  const source = (raw?.trim() || DEFAULT_ALLOWED_SIZES.join(",")).split(",");
  const sizes: Array<{ width: number; height: number; label: string }> = [];
  for (const part of source) {
    const match = /^(\d{2,4})x(\d{2,4})$/i.exec(part.trim());
    if (!match) continue;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width < 64 || height < 64 || width > 2048 || height > 2048) continue;
    sizes.push({ width, height, label: `${width}x${height}` });
  }
  return sizes.length > 0
    ? sizes
    : DEFAULT_ALLOWED_SIZES.map((label) => {
        const parts = label.split("x");
        const width = Number(parts[0]);
        const height = Number(parts[1]);
        return { width, height, label };
      });
}

// eslint-disable-next-line no-control-regex -- intentionally rejects control characters
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function sanitizePrompt(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export const createGenerationSchema = z
  .object({
    prompt: z.string().min(1).max(2000),
    negativePrompt: z.string().max(1000).optional().nullable(),
    width: z.number().int(),
    height: z.number().int(),
    projectId: z.string().cuid().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const prompt = sanitizePrompt(value.prompt);
    if (prompt.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["prompt"],
        message: "Enter a short room description.",
      });
    }
    if (CONTROL_CHARS.test(value.prompt)) {
      ctx.addIssue({
        code: "custom",
        path: ["prompt"],
        message: "Remove control characters from the prompt.",
      });
    }
    if (value.negativePrompt && CONTROL_CHARS.test(value.negativePrompt)) {
      ctx.addIssue({
        code: "custom",
        path: ["negativePrompt"],
        message: "Remove control characters from the negative prompt.",
      });
    }
    const allowed = parseAllowedSizes();
    if (
      !allowed.some(
        (size) => size.width === value.width && size.height === value.height,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["size"],
        message: `Choose an allowed size: ${allowed.map((s) => s.label).join(", ")}.`,
      });
    }
  });

export function promptSummary(prompt: string, max = 72): string {
  const clean = sanitizePrompt(prompt);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}
