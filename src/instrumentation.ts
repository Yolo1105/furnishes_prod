export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runBootPreflight } = await import("@/server/ops/preflight");
    await runBootPreflight();

    const { logOps } = await import("@/server/ops/log");
    logOps("info", "app_boot", {
      nodeEnv: process.env.NODE_ENV ?? null,
      version: process.env.APP_VERSION?.trim() || null,
      commit: process.env.GIT_COMMIT?.trim() || null,
      chatProvider: process.env.CHAT_PROVIDER?.trim() || "local",
      storageProvider: process.env.STORAGE_PROVIDER?.trim() || "local",
    });

    process.on("unhandledRejection", (reason) => {
      logOps("error", "unhandled_rejection", { message: String(reason) });
    });
    process.on("uncaughtException", (error) => {
      logOps("error", "uncaught_exception", {
        name: error.name,
        message: error.message,
      });
    });

    const shutdown = async (signal: string) => {
      logOps("info", "app_shutdown", { signal });
      const { prisma } = await import("@/server/db");
      await prisma.$disconnect().catch(() => {});
      process.exit(0);
    };
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  }
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const { logOps, requestIdFromHeaders } = await import("@/server/ops/log");
  logOps("error", "request_error", {
    requestId: requestIdFromHeaders(new Headers(request.headers)),
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
    name: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : String(error),
  });
}
