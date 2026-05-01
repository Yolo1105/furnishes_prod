import path from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Preserve `DATABASE_URL` if it was set before dotenv (e.g.
 * `cross-env DATABASE_URL=file:./prisma/dev.db prisma migrate dev`) so `.env.local`
 * does not override a deliberate SQLite URL during migrations.
 */
const cliDatabaseUrl = process.env.DATABASE_URL?.trim();

// With `prisma.config.ts`, Prisma does not auto-load `.env` — mirror Next.js: base then local overrides.
loadEnv({ path: path.join(process.cwd(), ".env") });
loadEnv({
  path: path.join(process.cwd(), ".env.local"),
  override: true,
});

if (cliDatabaseUrl) {
  process.env.DATABASE_URL = cliDatabaseUrl;
}

/** Allows `prisma generate` / CLI when `DATABASE_URL` is unset (e.g. Vercel build). */
const PRISMA_CLI_PLACEHOLDER_DATASOURCE_URL =
  "postgresql://prisma-cli-placeholder:prisma@127.0.0.1:5432/prisma?schema=public";

const prismaCliDatasourceUrl =
  process.env.DATABASE_URL?.trim() || PRISMA_CLI_PLACEHOLDER_DATASOURCE_URL;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: prismaCliDatasourceUrl,
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
