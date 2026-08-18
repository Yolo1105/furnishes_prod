import { prisma } from "@/server/db";

type SecurityEventInput = {
  userId?: string | null | undefined;
  kind: string;
  meta?: string | Record<string, unknown> | null | undefined;
  ipAddress?: string | null | undefined;
};

function serializeMeta(meta: SecurityEventInput["meta"]): string | null {
  if (meta == null) return null;
  if (typeof meta === "string") return meta;
  return JSON.stringify(meta);
}

/** Shared audit writer for auth, privacy, and product events. */
export async function recordSecurityEvent(
  input: SecurityEventInput,
): Promise<void> {
  await prisma.securityEvent.create({
    data: {
      userId: input.userId ?? null,
      kind: input.kind,
      meta: serializeMeta(input.meta),
      ipAddress: input.ipAddress ?? null,
    },
  });
}
