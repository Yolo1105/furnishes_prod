/**
 * Client-safe API paths + JSON helpers for Eva UI.
 */

export const API_ROUTES = {
  chat: "/api/chat",
  extract: "/api/extract",
  conversations: "/api/conversations",
  conversation: (id: string) => `/api/conversations/${id}`,
  conversationPreferences: (id: string) =>
    `/api/conversations/${id}/preferences`,
  conversationTitle: (id: string) => `/api/conversations/${id}/title`,
} as const;

async function handleResponse<T>(res: Response, url?: string): Promise<T> {
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: res.statusText, status: res.status }));
    const body = err as {
      error?: string | { message?: string };
      status?: number;
    };
    const message =
      typeof body.error === "object" && body.error && "message" in body.error
        ? (body.error as { message: string }).message
        : typeof body.error === "string"
          ? body.error
          : res.statusText;
    const status = body.status ?? res.status;
    const hint = url ? ` (${url})` : "";
    throw new Error(
      status >= 500 ? `Server error (${status}): ${message}${hint}` : message,
    );
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  return handleResponse<T>(res, path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, path);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, path);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE" });
  return handleResponse<T>(res, path);
}
