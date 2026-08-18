/**
 * Advance or fail image generations that stopped making progress, so stuck rows
 * stop consuming each user's concurrency budget.
 *
 * Usage: pnpm image-gen:reconcile   (schedule every few minutes)
 * Env: IMAGE_GENERATION_RECONCILE_STALE_MINUTES (default 3),
 *      IMAGE_GENERATION_ABANDON_MINUTES (default 30),
 *      IMAGE_GENERATION_RECONCILE_BATCH (default 50)
 */

import { reconcileStuckImageGenerations } from "../src/server/image-generation/image-generation-reconcile";

async function main() {
  const result = await reconcileStuckImageGenerations();
  console.info("[image-gen:reconcile]", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
