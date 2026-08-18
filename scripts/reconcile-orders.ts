/**
 * Find unpaid orders whose hosted session should have settled, then pay or
 * cancel from the provider's current status.
 *
 * Usage: pnpm commerce:reconcile
 */

import { reconcilePendingOrders } from "../src/server/commerce/reconcile-orders";

async function main() {
  const result = await reconcilePendingOrders();
  console.info("[commerce:reconcile]", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
