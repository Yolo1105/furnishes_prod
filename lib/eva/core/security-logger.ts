import pino from "pino";

export type SecurityEventType =
  | "rate_limit"
  | "injection_detected"
  | "moderation_flagged"
  | "auth_failure"
  | "cost_limit_hit"
  | "global_cost_limit_hit";

export interface SecurityEvent {
  type: SecurityEventType;
  clientIp?: string;
  conversationId?: string;
  userId?: string;
  details?: string;
  /** Present for global_cost_limit_hit */
  currentCost?: number;
  limit?: number;
  timestamp?: string;
}

const securityLogger = pino({
  level: "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
}).child({ component: "security" });

export function logSecurityEvent(event: SecurityEvent): void {
  const {
    type,
    clientIp,
    conversationId,
    userId,
    details,
    currentCost,
    limit,
  } = event;
  securityLogger.warn({
    type,
    clientIp,
    conversationId,
    userId,
    details,
    currentCost,
    limit,
    timestamp: new Date().toISOString(),
  });
}
