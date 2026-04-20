/**
 * Lightweight API client and route constants (client-safe).
 */

export const API_ROUTES = {
  config: "/api/config",
  chat: "/api/chat",
  extract: "/api/extract",
  brainstorm: "/api/brainstorm",
  suggestions: "/api/suggestions",
  upload: "/api/upload",
  /** R2: JSON body → presigned PUT → POST uploads/confirm */
  uploadsSign: "/api/uploads/sign",
  uploadsConfirm: "/api/uploads/confirm",
  conversations: "/api/conversations",
  /** Optional `?projectId=` or `?projectId=` empty for unassigned (signed-in only). */
  conversationsForProject: (projectId: string | null) =>
    projectId
      ? `/api/conversations?projectId=${encodeURIComponent(projectId)}`
      : "/api/conversations?projectId=",
  projects: "/api/projects",
  project: (id: string, opts?: { includeSummary?: boolean }) => {
    const qs = new URLSearchParams();
    if (opts?.includeSummary) qs.set("includeSummary", "1");
    const suffix = qs.toString();
    return `/api/projects/${id}${suffix ? `?${suffix}` : ""}`;
  },
  projectSummary: (id: string) => `/api/projects/${id}/summary`,
  projectExport: (id: string, format: "html" | "json" = "html") =>
    `/api/projects/${id}/export?format=${format}`,
  projectShortlist: (projectId: string) =>
    `/api/projects/${projectId}/shortlist`,
  projectShortlistItem: (projectId: string, itemId: string) =>
    `/api/projects/${projectId}/shortlist/${encodeURIComponent(itemId)}`,
  /** GET saved Eva Studio room for a project; optional `savedRoom` / `savedRoomId` query. */
  projectSavedRoom: (id: string, query?: { savedRoomId?: string }) => {
    const qs = new URLSearchParams();
    if (query?.savedRoomId) qs.set("savedRoom", query.savedRoomId);
    const suffix = qs.toString();
    return `/api/projects/${id}/saved-room${suffix ? `?${suffix}` : ""}`;
  },
  projectFiles: (id: string) => `/api/projects/${id}/files`,
  projectWorkflow: (id: string) => `/api/projects/${id}/workflow`,
  projectExecutionTasks: (projectId: string) =>
    `/api/projects/${projectId}/execution/tasks`,
  projectExecutionTask: (projectId: string, taskId: string) =>
    `/api/projects/${projectId}/execution/tasks/${encodeURIComponent(taskId)}`,
  projectExecutionBlockers: (projectId: string) =>
    `/api/projects/${projectId}/execution/blockers`,
  projectExecutionBlocker: (projectId: string, blockerId: string) =>
    `/api/projects/${projectId}/execution/blockers/${encodeURIComponent(blockerId)}`,
  projectInvitations: (projectId: string) =>
    `/api/projects/${projectId}/invitations`,
  projectInvitationAccept: "/api/project-invitations/accept",
  projectComments: (
    projectId: string,
    query?: { targetType?: string; targetId?: string },
  ) => {
    const qs = new URLSearchParams();
    if (query?.targetType) qs.set("targetType", query.targetType);
    if (query?.targetId !== undefined) qs.set("targetId", query.targetId);
    const s = qs.toString();
    return `/api/projects/${projectId}/comments${s ? `?${s}` : ""}`;
  },
  projectComment: (projectId: string, commentId: string) =>
    `/api/projects/${projectId}/comments/${encodeURIComponent(commentId)}`,
  projectApprovals: (projectId: string) =>
    `/api/projects/${projectId}/approvals`,
  projectTimeline: (projectId: string, take?: number) => {
    const qs = new URLSearchParams();
    if (take != null) qs.set("take", String(take));
    const s = qs.toString();
    return `/api/projects/${projectId}/timeline${s ? `?${s}` : ""}`;
  },
  projectPacketSends: (projectId: string) =>
    `/api/projects/${projectId}/packet-sends`,
  notifications: (take?: number) => {
    const qs = new URLSearchParams();
    if (take != null) qs.set("take", String(take));
    const s = qs.toString();
    return `/api/notifications${s ? `?${s}` : ""}`;
  },
  notification: (id: string) => `/api/notifications/${encodeURIComponent(id)}`,
  projectMember: (projectId: string, memberId: string) =>
    `/api/projects/${projectId}/members/${encodeURIComponent(memberId)}`,
  conversation: (id: string) => `/api/conversations/${id}`,
  conversationPreferences: (id: string) =>
    `/api/conversations/${id}/preferences`,
  conversationPreferencesConfirm: (id: string) =>
    `/api/conversations/${id}/preferences/confirm`,
  conversationPreferencesReject: (id: string) =>
    `/api/conversations/${id}/preferences/reject`,
  conversationShare: (id: string) => `/api/conversations/${id}/share`,
  /** GET JSON for a share token (API). */
  shared: (shareId: string) => `/api/shared/${shareId}`,
  /** Public read-only page for recipients (same host as `shareUrl` from POST share). */
  sharedPage: (shareId: string) => `/shared/${shareId}`,
  conversationInsights: (id: string) => `/api/conversations/${id}/insights`,
  conversationRecommendations: (id: string) =>
    `/api/conversations/${id}/recommendations`,
  conversationTitle: (id: string) => `/api/conversations/${id}/title`,
  conversationExport: (id: string, format?: string, includeMessages = true) => {
    const params = new URLSearchParams();
    if (format) params.set("format", format);
    if (!includeMessages) params.set("include_messages", "false");
    const qs = params.toString();
    return `/api/conversations/${id}/export${qs ? `?${qs}` : ""}`;
  },
  conversationEvents: (id: string) => `/api/conversations/${id}/events`,
  /** Preference trajectory + LLM summary (analytics.trends_enabled in domain.json). */
  conversationTrends: (id: string) => `/api/conversations/${id}/trends`,
  conversationFiles: (id: string) => `/api/conversations/${id}/files`,
  conversationFileDownload: (conversationId: string, fileId: string) =>
    `/api/conversations/${conversationId}/files/${fileId}/download`,
  messageFeedback: (messageId: string) => `/api/messages/${messageId}/feedback`,
  message: (messageId: string) => `/api/messages/${messageId}`,
  /** Chat UX telemetry (server logs only). */
  chatQuality: "/api/eva/chat-quality",
  playbook: "/api/playbook",
} as const;

async function handleResponse<T>(res: Response, url?: string): Promise<T> {
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: res.statusText, status: res.status }));
    const body = err as {
      error?: string | { code?: string; message?: string; details?: unknown };
      status?: number;
    };
    const message =
      typeof body.error === "object" && body.error?.message
        ? body.error.message
        : typeof body.error === "string"
          ? body.error
          : res.statusText;
    const status = body.status ?? res.status;
    const hint = url ? ` (${url})` : "";
    const fallback =
      status >= 500 && message === "Internal Server Error"
        ? " Check server logs and env (e.g. DATABASE_URL, OPENAI_API_KEY)."
        : "";
    throw new Error(
      status >= 500
        ? `Server error (${status}): ${message}${hint}${fallback}`
        : message,
    );
  }
  return res.json() as Promise<T>;
}

const sameOriginFetch = (input: string, init?: RequestInit) =>
  fetch(input, { ...init, credentials: "include" });

/** GET request; throws on !res.ok, returns parsed JSON. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await sameOriginFetch(path);
  return handleResponse<T>(res, path);
}

/** POST request with JSON body; throws on !res.ok, returns parsed JSON. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await sameOriginFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, path);
}

/** PUT request with JSON body; throws on !res.ok, returns parsed JSON. */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await sameOriginFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, path);
}

/** PATCH request with JSON body; throws on !res.ok, returns parsed JSON. */
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await sameOriginFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, path);
}

/** DELETE request with optional JSON body; throws on !res.ok, returns parsed JSON. */
export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  const res = await sameOriginFetch(path, {
    method: "DELETE",
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res, path);
}
