/** Wire shape expected by playground conversation-sync (Supabase legacy). */
export type PlaygroundConversationRow = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type PlaygroundConversationMessageRow = {
  id: string;
  conversation_id: string;
  user_text: string;
  response: string;
  display_time: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  position_hint: number;
};

export function toConversationRow(row: {
  id: string;
  ownerId: string;
  projectId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}): PlaygroundConversationRow {
  return {
    id: row.id,
    user_id: row.ownerId,
    project_id: row.projectId,
    title: row.title,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toMessageRow(row: {
  id: string;
  conversationId: string;
  userText: string;
  response: string;
  displayTime: string;
  metadata: unknown;
  createdAt: Date;
  positionHint: number;
}): PlaygroundConversationMessageRow {
  return {
    id: row.id,
    conversation_id: row.conversationId,
    user_text: row.userText,
    response: row.response,
    display_time: row.displayTime,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    created_at: row.createdAt.toISOString(),
    position_hint: row.positionHint,
  };
}
