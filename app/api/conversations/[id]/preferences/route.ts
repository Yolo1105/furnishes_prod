import { z } from "zod";

import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { normalizeValue } from "@/lib/eva/extraction/normalize";

export const dynamic = "force-dynamic";

const PreferencesPatchSchema = z.object({
  field: z.string(),
  value: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  const prefs = await prisma.preference.findMany({
    where: { conversationId: id },
  });
  return Response.json(prefs);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  const body = await req.json();
  const parsed = PreferencesPatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid request",
      400,
      parsed.error.flatten(),
    );
  }
  const { field, value } = parsed.data;
  const raw = value ?? "";
  const [normalized] = normalizeValue(raw);
  const finalValue = Array.isArray(normalized)
    ? normalized.join(", ")
    : (normalized ?? raw);
  const existing = await prisma.preference.findUnique({
    where: { conversationId_field: { conversationId: id, field } },
  });
  await prisma.preferenceChange.create({
    data: {
      conversationId: id,
      field,
      oldValue: existing?.value ?? null,
      newValue: finalValue,
      confidence: 1.0,
      changeType: "manual_edit",
    },
  });
  const pref = await prisma.preference.upsert({
    where: {
      conversationId_field: { conversationId: id, field },
    },
    create: {
      conversationId: id,
      field,
      value: finalValue,
      confidence: 1.0,
      status: "confirmed",
    },
    update: { value: finalValue, confidence: 1.0, status: "confirmed" },
  });
  return Response.json(pref);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  const url = new URL(req.url);
  const field = url.searchParams.get("field");
  if (!field) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Missing field query param",
      400,
    );
  }
  const existing = await prisma.preference.findUnique({
    where: { conversationId_field: { conversationId: id, field } },
  });
  if (!existing) {
    return apiError(ErrorCodes.NOT_FOUND, "Preference not found", 404);
  }
  await prisma.preferenceChange.create({
    data: {
      conversationId: id,
      field,
      oldValue: existing.value,
      newValue: "",
      confidence: 1,
      changeType: "delete",
    },
  });
  await prisma.preference.delete({
    where: { conversationId_field: { conversationId: id, field } },
  });
  return Response.json({ ok: true });
}
