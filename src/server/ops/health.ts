import { prisma } from "@/server/db";

type HealthLiveness = {
  status: "ok";
  application: "web";
};

type HealthReadiness = HealthLiveness & {
  ready: boolean;
  checks: {
    database: "ok" | "error";
  };
  version: string | null;
  commit: string | null;
};

export function buildLiveness(): HealthLiveness {
  return {
    status: "ok",
    application: "web",
  };
}

export async function buildReadiness(): Promise<HealthReadiness> {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  return {
    ...buildLiveness(),
    ready: database === "ok",
    checks: { database },
    version: process.env.APP_VERSION?.trim() || null,
    commit: process.env.GIT_COMMIT?.trim() || null,
  };
}
