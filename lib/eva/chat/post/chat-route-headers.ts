import { getDomainConfig } from "@/lib/eva/domain/config";

export {
  CHAT_OUTBOUND_HTTP,
  CHAT_ROUTE_HEADER,
} from "@/lib/eva/core/chat-http-header-names";

export function getMaxMessageLength(): number {
  return getDomainConfig().guardrails?.max_message_length ?? 10000;
}
