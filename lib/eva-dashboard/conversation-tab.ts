/** Sidebar tab id for a persisted conversation (`convo-` + DB id). */
export function conversationTabId(conversationId: string): string {
  return `convo-${conversationId}`;
}
