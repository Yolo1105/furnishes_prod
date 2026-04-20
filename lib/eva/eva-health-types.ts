/** Shared type for `GET /api/eva/health` — safe for client + server. */
export type EvaHealthResponse = {
  ok: boolean;
  database: "up" | "error";
  llm: "configured" | "missing";
  hints?: string[];
};
