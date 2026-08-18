/**
 * Legacy (furnishes_prod) row shapes used by the selective chat/memory importer.
 * These are intentionally detached from Prisma — loaders hydrate them from SQL
 * or fixture JSON.
 */

type LegacyUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  password: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LegacyConversationRow = {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  title: string;
  status: string;
  projectId: string | null;
  assistantId: string | null;
  createdAt: string;
  updatedAt: string;
};

type LegacyMessageRow = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
};

export type LegacyMessageFeedbackRow = {
  id: string;
  messageId: string;
  rating: string;
  createdAt: string;
};

export type LegacyUserPreferenceRow = {
  id: string;
  userId: string;
  group: string;
  field: string;
  value: string;
  status: string;
  confidence: number;
  sourceConversationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LegacyConversationPreferenceRow = {
  id: string;
  conversationId: string;
  field: string;
  value: string;
  confidence: number;
  status: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

type LegacyPreferenceChangeRow = {
  id: string;
  conversationId: string;
  field: string;
  newValue: string;
  confirmed: boolean;
  createdAt: string;
};

export type LegacyChatSnapshot = {
  users: LegacyUserRow[];
  conversations: LegacyConversationRow[];
  messages: LegacyMessageRow[];
  feedback: LegacyMessageFeedbackRow[];
  userPreferences: LegacyUserPreferenceRow[];
  conversationPreferences: LegacyConversationPreferenceRow[];
  preferenceChanges: LegacyPreferenceChangeRow[];
  /** Target project ids that already exist (for orphan project detection). */
  targetProjectIds?: string[];
  /** Target users already present (id + email). */
  targetUsers?: Array<{ id: string; email: string }>;
};

export type MigrationConflict = {
  code: string;
  entity: string;
  entityId: string;
  detail: string;
};

export type MigrationSkip = {
  reason: string;
  entity: string;
  entityId: string;
  detail?: string;
};

export type PlannedUser = {
  legacyId: string;
  targetUserId: string;
  email: string;
  match: "id" | "email";
  activeAssistantId: string;
};

type PlannedConversation = {
  id: string;
  userId: string;
  title: string;
  status: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  legacyAssistantId: string | null;
};

type PlannedMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  status: "complete";
  assistantId: string | null;
  createdAt: string;
};

export type PlannedFeedback = {
  messageId: string;
  userId: string;
  rating: "up" | "down";
  legacyFeedbackIds: string[];
};

export type PlannedPreference = {
  userId: string;
  category: "room" | "budget" | "style" | "color" | "furniture";
  value: string;
  confidence: number;
  source: string;
  sourceConversationId: string | null;
  legacyIds: string[];
};

export type LegacyChatMigrationPlan = {
  users: PlannedUser[];
  conversations: PlannedConversation[];
  messages: PlannedMessage[];
  feedback: PlannedFeedback[];
  preferences: PlannedPreference[];
  skips: MigrationSkip[];
  conflicts: MigrationConflict[];
  sourceCounts: Record<string, number>;
  plannedCounts: Record<string, number>;
};
