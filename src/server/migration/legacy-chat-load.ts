import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import type { LegacyChatSnapshot } from "./legacy-chat-types";

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  throw new Error(`Expected date, got ${typeof value}`);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  throw new Error(`Expected string, got ${typeof value}`);
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  return asString(value);
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(`Expected number, got ${typeof value}`);
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  throw new Error(`Expected boolean, got ${typeof value}`);
}

/**
 * Load a migration snapshot from a JSON fixture file.
 */
export async function loadLegacyChatSnapshotFromFixture(
  path: string,
): Promise<LegacyChatSnapshot> {
  const raw = JSON.parse(await readFile(path, "utf8")) as LegacyChatSnapshot;
  return {
    users: raw.users ?? [],
    conversations: raw.conversations ?? [],
    messages: raw.messages ?? [],
    feedback: raw.feedback ?? [],
    userPreferences: raw.userPreferences ?? [],
    conversationPreferences: raw.conversationPreferences ?? [],
    preferenceChanges: raw.preferenceChanges ?? [],
    targetProjectIds: raw.targetProjectIds ?? [],
    targetUsers: raw.targetUsers ?? [],
  };
}

/**
 * Load legacy rows via raw SQL against LEGACY_DATABASE_URL.
 * Uses a throwaway Prisma client (queryRaw only — not the temp schema models).
 */
export async function loadLegacyChatSnapshotFromDatabase(input: {
  legacyDatabaseUrl: string;
  targetDatabaseUrl: string;
}): Promise<LegacyChatSnapshot> {
  const legacy = new PrismaClient({
    datasources: { db: { url: input.legacyDatabaseUrl } },
  });
  const target = new PrismaClient({
    datasources: { db: { url: input.targetDatabaseUrl } },
  });

  try {
    const [
      users,
      conversations,
      messages,
      feedback,
      userPreferences,
      conversationPreferences,
      preferenceChanges,
      targetUsers,
      targetProjects,
    ] = await Promise.all([
      legacy.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, email, name, password, "createdAt", "updatedAt" FROM "User"`,
      ),
      legacy.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, "userId", "guestSessionId", title, status::text AS status, "projectId", "assistantId", "createdAt", "updatedAt" FROM "Conversation"`,
      ),
      legacy.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, "conversationId", role, content, "createdAt" FROM "Message"`,
      ),
      legacy.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, "messageId", rating, "createdAt" FROM "MessageFeedback"`,
      ),
      legacy.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, "userId", "group"::text AS "group", field, value, status::text AS status, confidence, "sourceConversationId", "createdAt", "updatedAt" FROM "UserPreference"`,
      ),
      legacy.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, "conversationId", field, value, confidence, status, source, "createdAt", "updatedAt" FROM "Preference"`,
      ),
      legacy.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, "conversationId", field, "newValue", confirmed, "createdAt" FROM "PreferenceChange"`,
      ),
      target.user.findMany({ select: { id: true, email: true } }),
      target.project.findMany({ select: { id: true } }),
    ]);

    return {
      users: users.map((row) => ({
        id: asString(row.id),
        email: asNullableString(row.email),
        name: asNullableString(row.name),
        password: asNullableString(row.password),
        createdAt: asIso(row.createdAt),
        updatedAt: asIso(row.updatedAt),
      })),
      conversations: conversations.map((row) => ({
        id: asString(row.id),
        userId: asNullableString(row.userId),
        guestSessionId: asNullableString(row.guestSessionId),
        title: asString(row.title),
        status: asString(row.status),
        projectId: asNullableString(row.projectId),
        assistantId: asNullableString(row.assistantId),
        createdAt: asIso(row.createdAt),
        updatedAt: asIso(row.updatedAt),
      })),
      messages: messages.map((row) => ({
        id: asString(row.id),
        conversationId: asString(row.conversationId),
        role: asString(row.role),
        content: asString(row.content),
        createdAt: asIso(row.createdAt),
      })),
      feedback: feedback.map((row) => ({
        id: asString(row.id),
        messageId: asString(row.messageId),
        rating: asString(row.rating),
        createdAt: asIso(row.createdAt),
      })),
      userPreferences: userPreferences.map((row) => ({
        id: asString(row.id),
        userId: asString(row.userId),
        group: asString(row.group),
        field: asString(row.field),
        value: asString(row.value),
        status: asString(row.status),
        confidence: asNumber(row.confidence),
        sourceConversationId: asNullableString(row.sourceConversationId),
        createdAt: asIso(row.createdAt),
        updatedAt: asIso(row.updatedAt),
      })),
      conversationPreferences: conversationPreferences.map((row) => ({
        id: asString(row.id),
        conversationId: asString(row.conversationId),
        field: asString(row.field),
        value: asString(row.value),
        confidence: asNumber(row.confidence),
        status: asString(row.status),
        source: asNullableString(row.source),
        createdAt: asIso(row.createdAt),
        updatedAt: asIso(row.updatedAt),
      })),
      preferenceChanges: preferenceChanges.map((row) => ({
        id: asString(row.id),
        conversationId: asString(row.conversationId),
        field: asString(row.field),
        newValue: asString(row.newValue),
        confirmed: asBoolean(row.confirmed),
        createdAt: asIso(row.createdAt),
      })),
      targetUsers,
      targetProjectIds: targetProjects.map((row) => row.id),
    };
  } finally {
    await Promise.all([legacy.$disconnect(), target.$disconnect()]);
  }
}
