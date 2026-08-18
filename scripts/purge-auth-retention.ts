/**
 * Purge aged SecurityEvent rows, expired/revoked sessions, used/expired
 * email tokens, stale AuthRateLimit windows, and high-growth operational
 * tables (CostLog, ImplicitSignal, ChatGeneration, WorkflowEvent).
 *
 * Usage: pnpm auth:purge-retention
 * Env: SECURITY_EVENT_RETENTION_DAYS (default 90),
 *      AUTH_RATE_LIMIT_RETENTION_DAYS (default 7),
 *      COST_LOG_RETENTION_DAYS (default 90),
 *      IMPLICIT_SIGNAL_RETENTION_DAYS (default 90),
 *      CHAT_GENERATION_RETENTION_DAYS (default 90),
 *      WORKFLOW_EVENT_RETENTION_DAYS (default 90)
 */

import { purgeRetention } from "../src/server/auth/retention";

async function main() {
  const result = await purgeRetention();
  console.info("[auth:purge-retention]", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
