import { captureRequestError } from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertSeedReadinessProductionGuards } =
      await import("./lib/env/production-guards");
    assertSeedReadinessProductionGuards();

    await import("./sentry.server.config");
    if (process.env.NODE_ENV === "production") {
      const { logProductionConfigWarnings } =
        await import("./lib/auth/production-warnings");
      logProductionConfigWarnings();
    } else if (process.env.NODE_ENV === "development") {
      const { logEvaDevHealthToConsoleIfNeeded } =
        await import("./lib/eva/eva-health-check");
      await logEvaDevHealthToConsoleIfNeeded();
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = captureRequestError;
