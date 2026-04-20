import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import { apiError } from "@/lib/api/error";
import { prisma } from "@/lib/eva/db";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/**
 * GET /api/furniture/pieces
 * Recent durable studio pieces for the signed-in user (resume / history).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const { limit } = QuerySchema.parse({
      limit: sp.get("limit") ?? undefined,
    });

    const rows = await prisma.furnitureStudioPiece.findMany({
      where: { userId: user.userId, status: "completed" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        prompt: true,
        quality: true,
        status: true,
        providerImageUrl: true,
        providerGlbUrl: true,
        storedImageUrl: true,
        storedGlbUrl: true,
        sourcePieceId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ pieces: rows });
  } catch (e) {
    return apiError(e);
  }
}
