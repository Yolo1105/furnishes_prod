/**
 * Count bundle for account shell + dashboard — must stay aligned with
 * `resolveSession` DB queries.
 */
export type SessionCounts = {
  conversations: number;
  shortlist: number;
  projects: number;
  uploads: number;
};
