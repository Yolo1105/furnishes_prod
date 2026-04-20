import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generate } from "@/lib/furniture-gen/pipeline";
import type {
  GenerationQuality,
  MeshModelId,
  Progress,
} from "@/types/generation";
import { logFurnitureGeneration } from "@/lib/furniture-gen/observability";
import { requireUser } from "@/auth";
import { apiError } from "@/lib/api/error";
import { prisma } from "@/lib/eva/db";
import {
  strictRateLimit,
  rateLimitError,
  FURNITURE_LIMITS,
} from "@/lib/rate-limit";
import {
  assertSourcePieceOwned,
  finalizeStudioPieceAfterGeneration,
} from "@/lib/furniture-gen/create-studio-piece-from-generation";

export const runtime = "nodejs";
/**
 * Vercel Hobby: `maxDuration` must be ≤ 300s (5 min). Pro/Enterprise allow higher
 * limits in the dashboard — keep this at 300 so deploys succeed on Hobby.
 */
export const maxDuration = 300;

const BodySchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  imageQuality: z.enum(["fast", "balanced", "high"]).optional(),
  meshQuality: z.enum(["fast", "balanced", "high"]).optional(),
  meshModel: z.enum(["hunyuan3d", "meshy", "triposr", "stable3d"]).optional(),
  /** Studio UI tier — stored on `FurnitureStudioPiece.quality`. */
  qualityTier: z.enum(["fast", "balanced", "high"]).optional(),
  /** Set for "new variation" lineage; must belong to the same user. */
  sourcePieceId: z.string().cuid().optional().nullable(),
});

/**
 * POST /api/furniture/generate
 * SSE stream of Progress events (expanding → image_ready → meshing → done | error).
 * Requires signed-in user. Set FAL_KEY on the server.
 *
 * - Rate limited per user (see FURNITURE_LIMITS).
 * - Structured logs + `x-request-id` for tracing.
 * - Persists audit row in `FurnitureGeneration` (best-effort if DB write fails).
 */
export async function POST(req: NextRequest) {
  let user: { userId: string; email: string };
  try {
    user = await requireUser();
  } catch (e) {
    return apiError(e);
  }

  const limit = await strictRateLimit(user.userId, FURNITURE_LIMITS.generate);
  if (!limit.success) {
    return NextResponse.json(rateLimitError(limit), {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
        "X-RateLimit-Limit": String(limit.limit),
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  }

  let prompt: string;
  let imageQuality: GenerationQuality | undefined;
  let meshQuality: GenerationQuality | undefined;
  let meshModel: MeshModelId | undefined;
  let qualityTier: "fast" | "balanced" | "high";
  let sourcePieceId: string | null;

  try {
    const json = await req.json();
    const parsed = BodySchema.parse(json);
    prompt = parsed.prompt;
    imageQuality = parsed.imageQuality;
    meshQuality = parsed.meshQuality;
    meshModel = parsed.meshModel;
    qualityTier = parsed.qualityTier ?? "balanced";
    sourcePieceId = parsed.sourcePieceId ?? null;
  } catch (e) {
    return apiError(e);
  }

  const lineageOk = await assertSourcePieceOwned(
    user.userId,
    sourcePieceId ?? undefined,
  );
  if (!lineageOk.ok) {
    return NextResponse.json({ message: lineageOk.error }, { status: 400 });
  }

  const requestId = req.headers.get("x-request-id")?.trim() || randomUUID();
  const optionsJson = { imageQuality, meshQuality, meshModel };
  const t0 = Date.now();

  let auditId: string | null = null;
  try {
    const row = await prisma.furnitureGeneration.create({
      data: {
        userId: user.userId,
        requestId,
        prompt,
        options: optionsJson,
        status: "running",
      },
    });
    auditId = row.id;
  } catch (err) {
    logFurnitureGeneration({
      requestId,
      userId: user.userId,
      event: "audit_row_create_failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logFurnitureGeneration({
    requestId,
    userId: user.userId,
    event: "stream_start",
    promptLength: prompt.length,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      let lastStage = "";
      let errorMessage: string | null = null;
      let doneImageUrl: string | null = null;
      let doneGlbUrl: string | null = null;

      const qualityJson = {
        tier: qualityTier,
        imageQuality: imageQuality ?? "balanced",
        meshQuality: meshQuality ?? "balanced",
        meshModel: meshModel ?? "hunyuan3d",
      };

      try {
        for await (const event of generate(prompt, undefined, {
          imageQuality,
          meshQuality,
          meshModel,
        })) {
          const ev = event as Progress;
          if (ev.stage !== lastStage) {
            lastStage = ev.stage;
            logFurnitureGeneration({
              requestId,
              userId: user.userId,
              event: "stage",
              stage: ev.stage,
              elapsedMs: Date.now() - t0,
            });
          }

          send(event);

          if (ev.stage === "error") {
            errorMessage = ev.message;
          }
          if (ev.stage === "done") {
            doneImageUrl = ev.imageUrl;
            doneGlbUrl = ev.glbUrl;
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errorMessage = message;
        send({ stage: "error", message });
        logFurnitureGeneration({
          requestId,
          userId: user.userId,
          event: "stream_throw",
          error: message,
          elapsedMs: Date.now() - t0,
        });
      } finally {
        const durationMs = Date.now() - t0;
        if (auditId) {
          try {
            if (errorMessage) {
              await prisma.furnitureGeneration.update({
                where: { id: auditId },
                data: {
                  status: "failed",
                  errorMessage,
                  durationMs,
                  completedAt: new Date(),
                },
              });
            } else {
              await prisma.furnitureGeneration.update({
                where: { id: auditId },
                data: {
                  status: "completed",
                  imageUrl: doneImageUrl,
                  glbUrl: doneGlbUrl,
                  durationMs,
                  completedAt: new Date(),
                },
              });

              if (doneImageUrl && doneGlbUrl) {
                try {
                  const finalized = await finalizeStudioPieceAfterGeneration({
                    userId: user.userId,
                    furnitureGenerationId: auditId,
                    prompt,
                    quality: qualityJson,
                    providerImageUrl: doneImageUrl,
                    providerGlbUrl: doneGlbUrl,
                    sourcePieceId,
                  });
                  if (finalized.ok) {
                    send({
                      stage: "artifact_ready",
                      pieceId: finalized.piece.id,
                      title: finalized.piece.title,
                      imageUrl: finalized.piece.displayImageUrl,
                      glbUrl: finalized.piece.displayGlbUrl,
                      providerImageUrl: doneImageUrl,
                      providerGlbUrl: doneGlbUrl,
                      sourcePieceId: finalized.piece.sourcePieceId,
                    } satisfies Progress);
                  }
                } catch (persistErr) {
                  logFurnitureGeneration({
                    requestId,
                    userId: user.userId,
                    event: "studio_piece_finalize_failed",
                    error:
                      persistErr instanceof Error
                        ? persistErr.message
                        : String(persistErr),
                  });
                }
              }
            }
          } catch (e) {
            logFurnitureGeneration({
              requestId,
              userId: user.userId,
              event: "audit_row_update_failed",
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
        logFurnitureGeneration({
          requestId,
          userId: user.userId,
          event: "stream_end",
          ok: !errorMessage,
          durationMs,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "x-request-id": requestId,
    },
  });
}
