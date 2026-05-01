import "server-only";

/**
 * Canonical production deployment (not local `next start`, not Vercel preview).
 * Used to refuse dangerous test/demo flags at runtime.
 */
export function isDeployedProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.DEPLOYMENT_ENV === "production") return true;
  return false;
}

/**
 * Fail fast when seed-readiness test/demo flags are set on the real production deploy.
 * Invoked from `instrumentation.ts` (Node runtime).
 */
export function assertSeedReadinessProductionGuards(): void {
  if (!isDeployedProductionRuntime()) return;

  const violations: string[] = [];
  if (process.env.ALLOW_TEST_HELPERS === "1") {
    violations.push(
      "ALLOW_TEST_HELPERS leaks signup verification tokens — unset in production.",
    );
  }
  if (process.env.ALLOW_MOCK_AUTH === "1") {
    violations.push(
      "ALLOW_MOCK_AUTH enables mock-auth cookies — unset in production.",
    );
  }
  if (violations.length === 0) return;

  throw new Error(
    `[production guard] Refusing to start:\n${violations.map((v) => `  - ${v}`).join("\n")}`,
  );
}
