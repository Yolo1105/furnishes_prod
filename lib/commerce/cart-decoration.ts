import { getCollectionProduct } from "@/content/site/collection";
import { prisma } from "@/lib/db/prisma";
import type { CartItem } from "@/lib/site/commerce/types";

export type CartLineRow = {
  id: string;
  productId: string;
  variantId: string | null;
  qty: number;
  unitPriceCents: number;
  savedForLater: boolean;
  projectId: string | null;
};

function hashHue(productId: string): number {
  let h = 0;
  for (let i = 0; i < productId.length; i++)
    h = (h * 31 + productId.charCodeAt(i)) >>> 0;
  return h % 360;
}

function fallbackName(productId: string): string {
  const p = getCollectionProduct(productId);
  return p?.name ?? `Product ${productId.slice(0, 8)}`;
}

function fallbackCategory(productId: string): string {
  const p = getCollectionProduct(productId);
  return p?.category ?? "Items";
}

/** Enrich raw cart lines with shortlist + catalog fallbacks for the commerce UI. */
export async function decorateCartLines(
  userId: string,
  lines: CartLineRow[],
): Promise<CartItem[]> {
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const shortlistRows =
    productIds.length > 0
      ? await prisma.shortlistItem.findMany({
          where: { userId, productId: { in: productIds } },
          select: {
            productId: true,
            productName: true,
            productCategory: true,
            coverHue: true,
            projectId: true,
            project: { select: { title: true } },
          },
        })
      : [];
  const byPid = new Map(shortlistRows.map((s) => [s.productId, s]));

  const projectIds = [
    ...new Set(
      lines.map((l) => l.projectId).filter((x): x is string => Boolean(x)),
    ),
  ];
  const projects =
    projectIds.length > 0
      ? await prisma.project.findMany({
          where: { id: { in: projectIds }, userId },
          select: { id: true, title: true },
        })
      : [];
  const projectTitleById = new Map(projects.map((p) => [p.id, p.title]));

  return lines.map((line) => {
    const sl = byPid.get(line.productId);
    const projectName =
      sl?.project?.title ??
      (line.projectId ? projectTitleById.get(line.projectId) : undefined) ??
      null;
    return {
      id: line.id,
      productId: line.productId,
      productName: sl?.productName ?? fallbackName(line.productId),
      productCategory: sl?.productCategory ?? fallbackCategory(line.productId),
      variantLabel: line.variantId ?? undefined,
      unitPriceCents: line.unitPriceCents,
      currency: "SGD" as const,
      qty: line.qty,
      coverHue: sl?.coverHue ?? hashHue(line.productId),
      savedForLater: line.savedForLater,
      projectId: line.projectId ?? sl?.projectId ?? null,
      projectName,
    };
  });
}
