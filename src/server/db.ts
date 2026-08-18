import { PrismaClient } from "@prisma/client";

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
