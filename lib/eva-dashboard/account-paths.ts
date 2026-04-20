import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";

/**
 * Account shell page paths (Next.js routes), distinct from `API_ROUTES` (`/api/*`).
 */
export const accountPaths = {
  conversation: (id: string) =>
    `/account/conversations/${encodeURIComponent(id)}`,
  project: (id: string) => `/account/projects/${encodeURIComponent(id)}`,
  /** Deep-link into project detail tabs (`?tab=`). */
  projectWithTab: (id: string, tab: string) =>
    `/account/projects/${encodeURIComponent(id)}?tab=${encodeURIComponent(tab)}`,
  /** Review / presentation mode for collaborators (Phase 6D). */
  projectReview: (id: string) =>
    `/account/projects/${encodeURIComponent(id)}/review`,
  projects: "/account/projects",
  /** Accept invite (query `?token=`). */
  projectInviteLanding: "/account/project-invite",
  /** Global shortlist list route (revalidation / links). */
  shortlistRoot: "/account/shortlist",
  shortlistItem: (id: string) => `/account/shortlist/${encodeURIComponent(id)}`,
  /** Main Eva app shell (chat + workspace) — same href as `WORKFLOW_ROUTES.assistant`. */
  evaDesignWorkspace: WORKFLOW_ROUTES.assistant,
  /** Commerce (Phase 2+) — real account surfaces. */
  orders: "/account/orders",
  deliveries: "/account/deliveries",
  returns: "/account/returns",
  supportHelp: "/account/support/help",
  supportThread: (id: string) => `/account/support/${encodeURIComponent(id)}`,
} as const;
