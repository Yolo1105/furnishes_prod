import { NextResponse } from "next/server";
import { getMarketingHeaderContext } from "@/lib/auth/marketing-header-context";

export async function GET() {
  const ctx = await getMarketingHeaderContext();
  return NextResponse.json(ctx);
}
