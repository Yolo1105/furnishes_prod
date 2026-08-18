import { listCatalog } from "@/server/commerce/catalog-service";
import { settlementCurrency } from "@/server/commerce/commerce-config";
import { fromServiceResult, requireApiSession } from "@/server/http";

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const category = new URL(request.url).searchParams.get("category");
  return fromServiceResult(
    await listCatalog(settlementCurrency(session.user), {
      ...(category ? { category } : {}),
    }),
  );
}
