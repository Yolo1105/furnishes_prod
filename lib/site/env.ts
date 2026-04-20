import { z } from "zod";

/**
 * Validates `process.env` at startup (import from `app/layout.tsx`).
 * Add keys here when introducing server-only configuration.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    /** Prisma — set in `.env.local` (see `.env.example`). */
    DATABASE_URL: z.string().optional(),
  })
  .passthrough();

export const env = schema.parse(process.env);
