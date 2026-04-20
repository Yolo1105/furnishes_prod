import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { ConsentRow } from "@/lib/site/account/types";

export async function getAccountConsents(
  userId: string,
): Promise<ConsentRow[]> {
  const rows = await prisma.consent.findMany({
    where: { userId },
    orderBy: { grantedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    grantedAt: r.grantedAt.toISOString(),
    source: r.source,
    active: r.active,
  }));
}
