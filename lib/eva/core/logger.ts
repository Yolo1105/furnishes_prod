import pino from "pino";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  conversationId?: string;
  latencyMs?: number;
  error?: string;
  requestId?: string;
  [key: string]: unknown;
}

const pinoLogger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export function log(entry: LogEntry) {
  const { level, requestId, ...rest } = entry;
  const child = requestId ? pinoLogger.child({ requestId }) : pinoLogger;
  child[level](rest);
}

export function withRequestId(requestId: string) {
  return pinoLogger.child({ requestId });
}
