import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";

import { BUILD_PLACEHOLDER_DATABASE_URL } from "./env";

/**
 * Match `prisma.config.ts`: Prisma CLI loads these files explicitly; Next also
 * loads them for the dev server, but scripts/tests that import `prisma` first
 * should still see `DATABASE_URL` from disk. Preserve an already-set URL (e.g.
 * `DATABASE_URL=... npm run …`) so dotenv does not clobber it.
 */
const preservedDatabaseUrl = process.env.DATABASE_URL?.trim();
loadEnv({ path: path.join(process.cwd(), ".env") });
loadEnv({ path: path.join(process.cwd(), ".env.local"), override: true });
if (preservedDatabaseUrl) {
  process.env.DATABASE_URL = preservedDatabaseUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw && (process.env.VERCEL === "1" || process.env.CI === "true")) {
    return BUILD_PLACEHOLDER_DATABASE_URL;
  }
  return raw;
}

const DATABASE_MISSING_MESSAGE =
  "DATABASE_URL is not set. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a PostgreSQL URL, then run `npm run db:migrate:deploy` and `npm run db:seed:dev`.";

function createPrisma(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (
    url === BUILD_PLACEHOLDER_DATABASE_URL &&
    (process.env.VERCEL === "1" || process.env.CI === "true")
  ) {
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(
          "Database is not available during build. Set DATABASE_URL for runtime.",
        );
      },
    }) as PrismaClient;
  }

  /** Without a URL, a real PrismaClient still loads the engine and fails with noisy prisma:error logs on first query. */
  if (!url) {
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(DATABASE_MISSING_MESSAGE);
      },
    }) as PrismaClient;
  }

  /**
   * In dev, default to no Prisma log emission (connection failures still return errors to callers).
   * Set `PRISMA_LOG=1` in `.env.local` to enable `error` + `warn` logs while debugging SQL.
   */
  const devLog: ("error" | "warn" | "query" | "info")[] =
    process.env.PRISMA_LOG === "1" ? ["error", "warn"] : [];

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? devLog : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Warn if SQLite is used in production — it doesn't handle concurrent writes well.
if (process.env.NODE_ENV === "production") {
  const url = (process.env.DATABASE_URL ?? "").trim();
  if (url.startsWith("file:") || url.endsWith(".db")) {
    console.warn(
      "[eva] WARNING: SQLite detected in production (DATABASE_URL=%s). " +
        "SQLite does not support concurrent writes and may cause SQLITE_BUSY errors " +
        "under load. Migrate to PostgreSQL for production use.",
      url,
    );
  }
}
