import "server-only";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isMockAuthEnabled } from "@/lib/auth/mock-auth";
import type { MarketingHeaderContext } from "@/lib/auth/marketing-header-context.types";

const MOCK_DISPLAY_NAME = "Mohan Tan";
const MOCK_CART_COUNT = 3;

/**
 * Used by marketing `Header` (site shell): signed-in state, display name, cart count.
 * Respects mock-auth cookie and real NextAuth session.
 */
export async function getMarketingHeaderContext(): Promise<MarketingHeaderContext> {
  const cookieStore = await cookies();
  if (
    isMockAuthEnabled() &&
    cookieStore.get("furnishes-mock-auth")?.value === "1"
  ) {
    return {
      signedIn: true,
      displayName: MOCK_DISPLAY_NAME,
      cartCount: MOCK_CART_COUNT,
    };
  }

  const session = await auth().catch(() => null);
  if (!session?.user?.email) {
    return { signedIn: false, displayName: null, cartCount: 0 };
  }

  const displayName =
    session.user.name?.trim() || session.user.email.split("@")[0] || "Account";

  let cartCount = 0;
  if (process.env.DATABASE_URL && session.user.id) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const cart = await prisma.cart.findUnique({
        where: { userId: session.user.id },
        include: { _count: { select: { items: true } } },
      });
      cartCount = cart?._count.items ?? 0;
    } catch {
      // ignore
    }
  }

  return { signedIn: true, displayName, cartCount };
}
