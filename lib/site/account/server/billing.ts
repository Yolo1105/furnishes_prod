import "server-only";

import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Invoice } from "@/lib/site/account/types";

/** Re-export for callers that already import from `server/billing`. */
export { getAccountTokenUsage } from "@/lib/site/account/server/usage";

function mapInvoiceStatus(s: InvoiceStatus): Invoice["status"] {
  if (s === "failed") return "due";
  return s;
}

export async function getAccountInvoices(userId: string): Promise<Invoice[]> {
  const rows = await prisma.invoice.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    description: r.description,
    amountCents: r.amountCents,
    currency: r.currency,
    status: mapInvoiceStatus(r.status),
    issuedAt: r.issuedAt.toISOString(),
    pdfKey: r.pdfKey ?? undefined,
  }));
}
