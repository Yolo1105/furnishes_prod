import { PrismaClient } from "@prisma/client";

/** True when Prisma failed because the database is down or unreachable. */
export function isDatabaseUnreachable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  if (name === "PrismaClientInitializationError") return true;
  if (code === "P1001" || code === "P1017") return true;
  return /can't reach database server/i.test(message);
}

const globalForPrisma = globalThis as typeof globalThis & {
  __furnishesPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__furnishesPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__furnishesPrisma = prisma;
}
