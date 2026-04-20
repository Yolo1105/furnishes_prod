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

/**
 * Prisma 7+: connection URLs live here, not in `schema.prisma`.
 * When `DATABASE_URL` is unset (e.g. before Vercel env is applied), use a valid
 * placeholder so `prisma generate` can run — it does not open a real connection.
 */
const prismaCliDatasourceUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgresql://prisma-cli-placeholder:prisma@127.0.0.1:5432/prisma?schema=public";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: prismaCliDatasourceUrl,
  },
});
