import { z } from "zod";

/** Used during Vercel/CI build when DATABASE_URL is not set; db layer must not connect. */
export const BUILD_PLACEHOLDER_DATABASE_URL =
  "file:./prisma/build-placeholder.db";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .optional()
    .transform((v) => {
      const val = (v ?? "").trim();
      if (!val && (process.env.VERCEL === "1" || process.env.CI === "true")) {
        return BUILD_PLACEHOLDER_DATABASE_URL;
      }
      return val;
    })
    .refine((v) => (v ?? "").length > 0, {
      message: "DATABASE_URL is required",
    }),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z
    .string()
    .optional()
    .transform((v) => {
      const isProd = process.env.NODE_ENV === "production";
      const authOrNext =
        process.env.AUTH_SECRET?.trim() ||
        v?.trim() ||
        process.env.NEXTAUTH_SECRET?.trim();
      if (isProd && !authOrNext) {
        throw new Error(
          "AUTH_SECRET or NEXTAUTH_SECRET is required in production.",
        );
      }
      return authOrNext ? authOrNext : "build-placeholder-secret";
    }),
  NEXTAUTH_URL: z
    .string()
    .url()
    .optional()
    .transform((v) => v ?? "http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type EvaEnv = z.infer<typeof envSchema>;

let validated: EvaEnv | null = null;

export function getEvaEnv(): EvaEnv {
  if (validated) return validated;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      "Invalid environment variables:",
      result.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  }
  validated = result.data;
  return validated;
}
