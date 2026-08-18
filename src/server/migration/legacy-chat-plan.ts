import {
  DEFAULT_ASSISTANT_PERSONA_ID,
  getAssistantPersonaById,
  normalizeAssistantPersonaId,
} from "@/lib/eva/personas/catalog";
import { mapLegacyPreferenceCategory } from "./legacy-preference-map";
import type {
  LegacyChatMigrationPlan,
  LegacyChatSnapshot,
  LegacyConversationPreferenceRow,
  LegacyConversationRow,
  LegacyMessageFeedbackRow,
  LegacyUserPreferenceRow,
  MigrationConflict,
  MigrationSkip,
  PlannedFeedback,
  PlannedPreference,
  PlannedUser,
} from "./legacy-chat-types";

function isOwnedConversation(row: LegacyConversationRow): boolean {
  return Boolean(row.userId) && !row.guestSessionId;
}

function normalizeFeedbackRating(raw: string): "up" | "down" | null {
  const value = raw.trim().toLowerCase();
  if (value === "up" || value === "like" || value === "positive") return "up";
  if (value === "down" || value === "dislike" || value === "negative") {
    return "down";
  }
  return null;
}

function feedbackRank(rating: "up" | "down"): number {
  // Deterministic collision: newer wins; on same timestamp prefer down.
  return rating === "down" ? 2 : 1;
}

function resolvePersonaId(raw: string | null | undefined): {
  id: ReturnType<typeof normalizeAssistantPersonaId>;
  invalid: boolean;
} {
  if (!raw || !raw.trim()) {
    return { id: DEFAULT_ASSISTANT_PERSONA_ID, invalid: false };
  }
  const trimmed = raw.trim();
  if (!getAssistantPersonaById(trimmed)) {
    return { id: DEFAULT_ASSISTANT_PERSONA_ID, invalid: true };
  }
  return { id: normalizeAssistantPersonaId(trimmed), invalid: false };
}

function pickNewestConfirmedPreference(
  rows: Array<{
    legacyId: string;
    value: string;
    confidence: number;
    updatedAt: string;
    sourceConversationId: string | null;
    source: string;
  }>,
): { chosen: (typeof rows)[number] | null; conflict: boolean } {
  if (rows.length === 0) return { chosen: null, conflict: false };
  const sorted = [...rows].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
  const newest = sorted[0]!;
  const sameTime = sorted.filter(
    (row) => +new Date(row.updatedAt) === +new Date(newest.updatedAt),
  );
  const values = new Set(sameTime.map((row) => row.value.trim().toLowerCase()));
  if (values.size > 1) {
    return { chosen: null, conflict: true };
  }
  return { chosen: newest, conflict: false };
}

function planUsers(
  snapshot: LegacyChatSnapshot,
  conversations: LegacyConversationRow[],
  skips: MigrationSkip[],
  conflicts: MigrationConflict[],
): PlannedUser[] {
  const targetById = new Map(
    (snapshot.targetUsers ?? []).map((user) => [user.id, user]),
  );
  const targetByEmail = new Map(
    (snapshot.targetUsers ?? []).map((user) => [
      user.email.trim().toLowerCase(),
      user,
    ]),
  );

  const planned: PlannedUser[] = [];

  for (const legacy of snapshot.users) {
    const email = legacy.email?.trim().toLowerCase() ?? "";
    if (!email) {
      skips.push({
        reason: "user_missing_email",
        entity: "user",
        entityId: legacy.id,
      });
      continue;
    }

    const byId = targetById.get(legacy.id);
    const byEmail = targetByEmail.get(email);
    if (!byId && !byEmail) {
      conflicts.push({
        code: "user_unmatched",
        entity: "user",
        entityId: legacy.id,
        detail: `No target user for email ${email}. Create the account first.`,
      });
      continue;
    }
    if (byId && byEmail && byId.id !== byEmail.id) {
      conflicts.push({
        code: "user_id_email_mismatch",
        entity: "user",
        entityId: legacy.id,
        detail: `Legacy id maps to ${byId.id} but email maps to ${byEmail.id}.`,
      });
      continue;
    }

    const target = byId ?? byEmail!;
    const match = byId ? "id" : "email";

    const owned = conversations
      .filter((row) => row.userId === legacy.id && isOwnedConversation(row))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

    let activeAssistantId = DEFAULT_ASSISTANT_PERSONA_ID;
    const personaCandidates = owned
      .map((row) => resolvePersonaId(row.assistantId))
      .filter((row) => !row.invalid);
    if (personaCandidates.length > 0) {
      const first = personaCandidates[0]!;
      const unique = new Set(personaCandidates.slice(0, 3).map((p) => p.id));
      if (unique.size === 1) {
        activeAssistantId = first.id;
      } else if (owned[0]?.assistantId) {
        const resolved = resolvePersonaId(owned[0].assistantId);
        activeAssistantId = resolved.invalid
          ? DEFAULT_ASSISTANT_PERSONA_ID
          : resolved.id;
        if (resolved.invalid) {
          conflicts.push({
            code: "invalid_persona_id",
            entity: "conversation",
            entityId: owned[0].id,
            detail: `Unknown persona ${owned[0].assistantId}; defaulting user to eva-general.`,
          });
        }
      }
    } else if (owned[0]?.assistantId) {
      const resolved = resolvePersonaId(owned[0].assistantId);
      if (resolved.invalid) {
        conflicts.push({
          code: "invalid_persona_id",
          entity: "conversation",
          entityId: owned[0].id,
          detail: `Unknown persona ${owned[0].assistantId}; defaulting user to eva-general.`,
        });
      }
      activeAssistantId = resolved.id;
    }

    planned.push({
      legacyId: legacy.id,
      targetUserId: target.id,
      email,
      match,
      activeAssistantId,
    });
  }

  return planned;
}

function planPreferences(input: {
  userPreferences: LegacyUserPreferenceRow[];
  conversationPreferences: LegacyConversationPreferenceRow[];
  conversationsById: Map<string, LegacyConversationRow>;
  userIdByLegacy: Map<string, string>;
  importedConversationIds: Set<string>;
  skips: MigrationSkip[];
  conflicts: MigrationConflict[];
}): PlannedPreference[] {
  type Acc = {
    legacyId: string;
    value: string;
    confidence: number;
    updatedAt: string;
    sourceConversationId: string | null;
    source: string;
  };
  const byUserCategory = new Map<string, Acc[]>();
  const { skips, conflicts } = input;

  function push(
    userId: string,
    category: PlannedPreference["category"],
    row: Acc,
  ) {
    const key = `${userId}|${category}`;
    const list = byUserCategory.get(key) ?? [];
    list.push(row);
    byUserCategory.set(key, list);
  }

  for (const row of input.userPreferences) {
    if (row.status.trim().toLowerCase() !== "confirmed") {
      skips.push({
        reason: "preference_not_confirmed",
        entity: "user_preference",
        entityId: row.id,
      });
      continue;
    }
    const targetUserId = input.userIdByLegacy.get(row.userId);
    if (!targetUserId) {
      skips.push({
        reason: "preference_user_unmatched",
        entity: "user_preference",
        entityId: row.id,
      });
      continue;
    }
    const category = mapLegacyPreferenceCategory({
      group: row.group,
      field: row.field,
    });
    if (!category) {
      conflicts.push({
        code: "invalid_preference_mapping",
        entity: "user_preference",
        entityId: row.id,
        detail: `Cannot map group=${row.group} field=${row.field}.`,
      });
      continue;
    }
    push(targetUserId, category, {
      legacyId: row.id,
      value: row.value.trim(),
      confidence: row.confidence,
      updatedAt: row.updatedAt,
      sourceConversationId:
        row.sourceConversationId &&
        input.importedConversationIds.has(row.sourceConversationId)
          ? row.sourceConversationId
          : null,
      source: "legacy_user_preference",
    });
  }

  for (const row of input.conversationPreferences) {
    if (row.status.trim().toLowerCase() !== "confirmed") {
      skips.push({
        reason: "conversation_preference_not_confirmed",
        entity: "conversation_preference",
        entityId: row.id,
      });
      continue;
    }
    const conversation = input.conversationsById.get(row.conversationId);
    if (!conversation || !isOwnedConversation(conversation)) {
      skips.push({
        reason: "conversation_preference_unowned",
        entity: "conversation_preference",
        entityId: row.id,
      });
      continue;
    }
    if (!input.importedConversationIds.has(conversation.id)) {
      skips.push({
        reason: "conversation_preference_conversation_skipped",
        entity: "conversation_preference",
        entityId: row.id,
      });
      continue;
    }
    const targetUserId = input.userIdByLegacy.get(conversation.userId!);
    if (!targetUserId) {
      skips.push({
        reason: "conversation_preference_user_unmatched",
        entity: "conversation_preference",
        entityId: row.id,
      });
      continue;
    }
    const category = mapLegacyPreferenceCategory({ field: row.field });
    if (!category) {
      conflicts.push({
        code: "invalid_preference_mapping",
        entity: "conversation_preference",
        entityId: row.id,
        detail: `Cannot map field=${row.field}.`,
      });
      continue;
    }
    // Only promote when no newer user-level memory will claim the category.
    push(targetUserId, category, {
      legacyId: row.id,
      value: row.value.trim(),
      confidence: row.confidence,
      updatedAt: row.updatedAt,
      sourceConversationId: conversation.id,
      source: "legacy_conversation_preference",
    });
  }

  const planned: PlannedPreference[] = [];
  for (const [key, rows] of byUserCategory) {
    const [userId, category] = key.split("|") as [
      string,
      PlannedPreference["category"],
    ];
    const userLevel = rows.filter(
      (row) => row.source === "legacy_user_preference",
    );
    const conversationLevel = rows.filter(
      (row) => row.source === "legacy_conversation_preference",
    );

    const primaryPool =
      userLevel.length > 0
        ? userLevel
        : conversationLevel.length > 0
          ? conversationLevel
          : [];

    const { chosen, conflict } = pickNewestConfirmedPreference(primaryPool);
    if (conflict || !chosen) {
      conflicts.push({
        code: "preference_category_conflict",
        entity: "user",
        entityId: userId,
        detail: `Ambiguous confirmed values for category ${category}; manual review required.`,
      });
      continue;
    }

    // If user-level won, ignore older conversation values silently (skipped).
    if (userLevel.length > 0) {
      for (const row of conversationLevel) {
        skips.push({
          reason: "conversation_preference_superseded",
          entity: "conversation_preference",
          entityId: row.legacyId,
          detail: `User-level memory exists for ${category}.`,
        });
      }
    }

    planned.push({
      userId,
      category,
      value: chosen.value,
      confidence: chosen.confidence,
      source: chosen.source,
      sourceConversationId: chosen.sourceConversationId,
      legacyIds: primaryPool.map((row) => row.legacyId),
    });
  }

  return planned;
}

function planFeedback(input: {
  feedback: LegacyMessageFeedbackRow[];
  messagesById: Map<string, { conversationId: string }>;
  conversationUserId: Map<string, string>;
  importedMessageIds: Set<string>;
  skips: MigrationSkip[];
  conflicts: MigrationConflict[];
}): PlannedFeedback[] {
  const { skips, conflicts } = input;
  const byMessage = new Map<string, LegacyMessageFeedbackRow[]>();
  for (const row of input.feedback) {
    const list = byMessage.get(row.messageId) ?? [];
    list.push(row);
    byMessage.set(row.messageId, list);
  }

  const planned: PlannedFeedback[] = [];
  for (const [messageId, rows] of byMessage) {
    if (!input.importedMessageIds.has(messageId)) {
      for (const row of rows) {
        skips.push({
          reason: "feedback_message_skipped",
          entity: "feedback",
          entityId: row.id,
        });
      }
      continue;
    }
    const message = input.messagesById.get(messageId);
    if (!message) {
      for (const row of rows) {
        skips.push({
          reason: "feedback_orphaned_message",
          entity: "feedback",
          entityId: row.id,
        });
      }
      continue;
    }
    const userId = input.conversationUserId.get(message.conversationId);
    if (!userId) {
      for (const row of rows) {
        skips.push({
          reason: "feedback_user_unmatched",
          entity: "feedback",
          entityId: row.id,
        });
      }
      continue;
    }

    const ranked = rows
      .map((row) => {
        const rating = normalizeFeedbackRating(row.rating);
        return rating ? { row, rating, at: +new Date(row.createdAt) } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        if (b.at !== a.at) return b.at - a.at;
        return feedbackRank(b.rating) - feedbackRank(a.rating);
      });

    if (ranked.length === 0) {
      for (const row of rows) {
        conflicts.push({
          code: "invalid_feedback_rating",
          entity: "feedback",
          entityId: row.id,
          detail: `Unsupported rating ${row.rating}.`,
        });
      }
      continue;
    }

    const winner = ranked[0]!;
    planned.push({
      messageId,
      userId,
      rating: winner.rating,
      legacyFeedbackIds: rows.map((row) => row.id),
    });
  }
  return planned;
}

/**
 * Pure planner: legacy snapshot → import plan (no DB writes).
 */
export function buildLegacyChatMigrationPlan(
  snapshot: LegacyChatSnapshot,
): LegacyChatMigrationPlan {
  const skips: MigrationSkip[] = [];
  const conflicts: MigrationConflict[] = [];

  const sourceCounts = {
    users: snapshot.users.length,
    conversations: snapshot.conversations.length,
    messages: snapshot.messages.length,
    feedback: snapshot.feedback.length,
    userPreferences: snapshot.userPreferences.length,
    conversationPreferences: snapshot.conversationPreferences.length,
    preferenceChanges: snapshot.preferenceChanges.length,
  };

  for (const change of snapshot.preferenceChanges) {
    skips.push({
      reason: "preference_change_not_imported",
      entity: "preference_change",
      entityId: change.id,
      detail:
        "Legacy PreferenceChange is not a reliable pending/rejected signal.",
    });
  }

  const users = planUsers(snapshot, snapshot.conversations, skips, conflicts);
  const userIdByLegacy = new Map(
    users.map((user) => [user.legacyId, user.targetUserId]),
  );

  const targetProjectIds = new Set(snapshot.targetProjectIds ?? []);
  const conversationsById = new Map(
    snapshot.conversations.map((row) => [row.id, row]),
  );

  const conversations = [];
  for (const row of snapshot.conversations) {
    if (row.guestSessionId || !row.userId) {
      skips.push({
        reason: "guest_or_unowned_conversation",
        entity: "conversation",
        entityId: row.id,
        detail: "Guest/share domains are out of scope.",
      });
      continue;
    }
    const targetUserId = userIdByLegacy.get(row.userId);
    if (!targetUserId) {
      skips.push({
        reason: "conversation_user_unmatched",
        entity: "conversation",
        entityId: row.id,
      });
      continue;
    }

    let projectId: string | null = row.projectId;
    if (projectId && !targetProjectIds.has(projectId)) {
      conflicts.push({
        code: "orphaned_project_link",
        entity: "conversation",
        entityId: row.id,
        detail: `Project ${projectId} is not in the target database; clearing link.`,
      });
      projectId = null;
    }

    if (row.assistantId) {
      const resolved = resolvePersonaId(row.assistantId);
      if (resolved.invalid) {
        conflicts.push({
          code: "invalid_persona_id",
          entity: "conversation",
          entityId: row.id,
          detail: `Unknown persona ${row.assistantId}.`,
        });
      }
    }

    const status =
      row.status.trim().toLowerCase() === "archived" ? "archived" : "active";

    conversations.push({
      id: row.id,
      userId: targetUserId,
      title: row.title?.trim() || "New conversation",
      status,
      projectId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      legacyAssistantId: row.assistantId,
    });
  }

  const importedConversationIds = new Set(conversations.map((row) => row.id));
  const conversationUserId = new Map(
    conversations.map((row) => [row.id, row.userId]),
  );
  const conversationPersona = new Map(
    conversations.map((row) => [
      row.id,
      resolvePersonaId(row.legacyAssistantId).id,
    ]),
  );

  const messages = [];
  for (const row of snapshot.messages) {
    if (!importedConversationIds.has(row.conversationId)) {
      skips.push({
        reason: "message_conversation_skipped",
        entity: "message",
        entityId: row.id,
      });
      continue;
    }
    const role = row.role.trim().toLowerCase();
    if (role !== "user" && role !== "assistant") {
      skips.push({
        reason: "message_role_unsupported",
        entity: "message",
        entityId: row.id,
        detail: `role=${row.role}`,
      });
      continue;
    }
    const assistantId =
      role === "assistant"
        ? (conversationPersona.get(row.conversationId) ?? null)
        : null;
    messages.push({
      id: row.id,
      conversationId: row.conversationId,
      role,
      content: row.content,
      status: "complete" as const,
      assistantId,
      createdAt: row.createdAt,
    });
  }

  const importedMessageIds = new Set(messages.map((row) => row.id));
  const messagesById = new Map(
    messages.map((row) => [row.id, { conversationId: row.conversationId }]),
  );

  const feedback = planFeedback({
    feedback: snapshot.feedback,
    messagesById,
    conversationUserId,
    importedMessageIds,
    skips,
    conflicts,
  });

  const preferences = planPreferences({
    userPreferences: snapshot.userPreferences,
    conversationPreferences: snapshot.conversationPreferences,
    conversationsById,
    userIdByLegacy,
    importedConversationIds,
    skips,
    conflicts,
  });

  return {
    users,
    conversations,
    messages,
    feedback,
    preferences,
    skips,
    conflicts,
    sourceCounts,
    plannedCounts: {
      users: users.length,
      conversations: conversations.length,
      messages: messages.length,
      feedback: feedback.length,
      preferences: preferences.length,
      skips: skips.length,
      conflicts: conflicts.length,
    },
  };
}

export function formatLegacyChatMigrationReport(
  plan: LegacyChatMigrationPlan,
): string {
  const lines = [
    "Legacy chat migration report",
    "============================",
    "",
    "Source counts:",
    ...Object.entries(plan.sourceCounts).map(
      ([key, value]) => `  ${key}: ${value}`,
    ),
    "",
    "Planned counts:",
    ...Object.entries(plan.plannedCounts).map(
      ([key, value]) => `  ${key}: ${value}`,
    ),
    "",
    `Conflicts (${plan.conflicts.length}):`,
  ];
  for (const conflict of plan.conflicts.slice(0, 50)) {
    lines.push(
      `  [${conflict.code}] ${conflict.entity} ${conflict.entityId}: ${conflict.detail}`,
    );
  }
  if (plan.conflicts.length > 50) {
    lines.push(`  … ${plan.conflicts.length - 50} more`);
  }
  lines.push("", `Skips (${plan.skips.length}) by reason:`);
  const skipReasons = new Map<string, number>();
  for (const skip of plan.skips) {
    skipReasons.set(skip.reason, (skipReasons.get(skip.reason) ?? 0) + 1);
  }
  for (const [reason, count] of [...skipReasons.entries()].sort()) {
    lines.push(`  ${reason}: ${count}`);
  }
  return lines.join("\n");
}
