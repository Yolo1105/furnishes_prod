import {
  assistantPersonaSummary,
  getAssistantPersonaById,
  isAssistantPersonaId,
  listAssistantPersonas,
  normalizeAssistantPersonaId,
} from "@/lib/eva/personas/catalog";
import type { AssistantPersonaSummary } from "@/lib/eva/personas/persona-types";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";

export async function getAssistantPersonaState(userId: string): Promise<
  ServiceResult<
    {
      activePersona: AssistantPersonaSummary;
      availablePersonas: AssistantPersonaSummary[];
    },
    "not_found"
  >
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeAssistantId: true },
  });
  if (!user) return err("not_found", "User not found.");

  const active = getAssistantPersonaById(
    normalizeAssistantPersonaId(user.activeAssistantId),
  )!;
  return ok({
    activePersona: assistantPersonaSummary(active),
    availablePersonas: listAssistantPersonas().map(assistantPersonaSummary),
  });
}

export async function setActiveAssistantPersona(
  userId: string,
  assistantId: string,
): Promise<
  ServiceResult<
    { activePersona: AssistantPersonaSummary },
    "validation" | "not_found"
  >
> {
  if (!isAssistantPersonaId(assistantId)) {
    return err("validation", "Unknown assistant persona.", {
      assistantId: "Choose one of the four Eva personas.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return err("not_found", "User not found.");

  await prisma.user.update({
    where: { id: userId },
    data: { activeAssistantId: assistantId },
  });

  const persona = getAssistantPersonaById(assistantId)!;
  return ok({ activePersona: assistantPersonaSummary(persona) });
}
