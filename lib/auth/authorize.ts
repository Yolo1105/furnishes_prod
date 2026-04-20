/**
 * Authorization — the second line after authentication.
 *
 * Every resource check here takes `(userId, resourceId)` and throws
 * `ForbiddenError` on denial. Callers should catch and map to HTTP 403
 * (API routes) or rethrow through the error boundary (Server Actions).
 *
 * Pattern: fetch the minimum necessary columns to decide. Don't over-fetch.
 */

import { prisma } from "@/lib/db/prisma";

export class ForbiddenError extends Error {
  constructor(msg = "Not allowed") {
    super(msg);
    this.name = "ForbiddenError";
  }
}

/* ── Conversation ─────────────────────────────────────────── */

export async function canAccessConversation(
  userId: string,
  conversationId: string,
): Promise<void> {
  const row = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      userId: true,
      conversationShares: {
        where: { sharedWithUserId: userId },
        select: { id: true },
      },
    },
  });
  if (!row) throw new ForbiddenError("Conversation not found");
  if (row.userId === userId) return;
  if (row.conversationShares.length > 0) return;
  throw new ForbiddenError("You don't have access to this conversation");
}

/* ── Project ──────────────────────────────────────────────── */

export async function canAccessProject(
  userId: string,
  projectId: string,
): Promise<"owner" | "member"> {
  const row = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });
  if (!row) throw new ForbiddenError("Project not found");
  if (row.userId === userId) return "owner";
  if (row.members.length > 0) return "member";
  throw new ForbiddenError("You're not a member of this project");
}

export async function canEditProject(
  userId: string,
  projectId: string,
): Promise<void> {
  const role = await canAccessProject(userId, projectId);
  if (role === "owner") return;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (member && (member.role === "owner" || member.role === "editor")) return;
  throw new ForbiddenError("Editor role required");
}

/* ── Ownership (generic) ──────────────────────────────────── */

/**
 * Quick ownership check for singleton-per-user tables (Budget, NotificationPrefs,
 * UserProfile) or for tables where only the owner should read.
 *
 * Usage:
 *   await ensureOwns(userId, "shortlistItem", itemId);
 */
export async function ensureOwns(
  userId: string,
  table: OwnableTable,
  id: string,
): Promise<void> {
  const owner = await OWNER_RESOLVERS[table](id);
  if (owner !== userId) throw new ForbiddenError(`Not your ${table}`);
}

type OwnableTable =
  | "userPreference"
  | "shortlistItem"
  | "designPlaybook"
  | "upload"
  | "invoice"
  | "consent"
  | "passwordReset"
  | "dataExport";

const OWNER_RESOLVERS: Record<
  OwnableTable,
  (id: string) => Promise<string | null>
> = {
  userPreference: (id) =>
    prisma.userPreference
      .findUnique({ where: { id }, select: { userId: true } })
      .then((r) => r?.userId ?? null),
  shortlistItem: (id) =>
    prisma.shortlistItem
      .findUnique({ where: { id }, select: { userId: true } })
      .then((r) => r?.userId ?? null),
  designPlaybook: (id) =>
    prisma.designPlaybook
      .findUnique({ where: { id }, select: { userId: true } })
      .then((r) => r?.userId ?? null),
  upload: (id) =>
    prisma.upload
      .findUnique({ where: { id }, select: { userId: true } })
      .then((r) => r?.userId ?? null),
  invoice: (id) =>
    prisma.invoice
      .findUnique({ where: { id }, select: { userId: true } })
      .then((r) => r?.userId ?? null),
  consent: (id) =>
    prisma.consent
      .findUnique({ where: { id }, select: { userId: true } })
      .then((r) => r?.userId ?? null),
  passwordReset: (id) =>
    prisma.passwordReset
      .findUnique({ where: { id }, select: { userId: true } })
      .then((r) => r?.userId ?? null),
  dataExport: (id) =>
    prisma.dataExport
      .findUnique({ where: { id }, select: { userId: true } })
      .then((r) => r?.userId ?? null),
};
