import "server-only";

import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { listSupportThreads } from "@/lib/site/support/store";
import { isSupportThreadClosed } from "@/lib/site/support/status";
import type { SupportThread } from "@/lib/site/support/types";

const RETURNS_RELATED = new Set(["order", "billing"]);

function isReturnsRelated(t: SupportThread): boolean {
  return RETURNS_RELATED.has(t.category);
}

export type AccountReturnsState = {
  openThreads: SupportThread[];
  closedThreads: SupportThread[];
  /** Canonical help entry (new ticket + history). */
  supportHref: string;
};

/**
 * Returns / exchanges are handled via support — no commerce returns entity.
 * Surfaces HELP threads about orders or billing.
 */
export async function getAccountReturnsState(
  userId: string,
): Promise<AccountReturnsState> {
  const { threads } = await listSupportThreads(userId, {
    kind: "HELP",
    limit: 50,
  });

  const relevant = threads.filter(isReturnsRelated);
  const openThreads = relevant.filter((t) => !isSupportThreadClosed(t.status));
  const closedThreads = relevant.filter((t) => isSupportThreadClosed(t.status));

  return {
    openThreads,
    closedThreads,
    supportHref: accountPaths.supportHelp,
  };
}
