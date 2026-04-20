/**
 * Domain configuration (fields, system prompt, conversation limits).
 * Loads `config/domain.json` from the project root.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface DomainField {
  id: string;
  label: string;
  type: string;
  vocabulary?: string[];
  suggestions?: string[];
}

export interface DomainConfig {
  name: string;
  system_prompt: string;
  fields: DomainField[];
  recommendations?: {
    enabled: boolean;
    max_items: number;
    include_alternatives?: boolean;
    rubric_enabled?: boolean;
  };
  analytics?: {
    insights_enabled: boolean;
    trends_enabled: boolean;
    export_formats: string[];
  };
  guardrails?: {
    moderation_enabled: boolean;
    injection_detection: boolean;
    max_message_length: number;
  };
  conversation?: {
    max_history: number;
    summarize_after: number;
    max_context_tokens: number;
    review_prompt_interval?: number;
  };
  rate_limits?: {
    requests_per_minute: number;
    session_cost_limit_usd: number;
    /** Sum of all CostLog for the current UTC day. Set to `0` to disable the cap. */
    global_daily_cost_limit_usd?: number;
  };
}

let cached: DomainConfig | null = null;

function getConfigPath(): string {
  return join(process.cwd(), "config", "domain.json");
}

export function getDomainConfig(): DomainConfig {
  if (cached && process.env.NODE_ENV === "production") return cached;
  try {
    const path = getConfigPath();
    const raw = readFileSync(path, "utf-8");
    cached = JSON.parse(raw) as DomainConfig;
    return cached!;
  } catch (e) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `config/domain.json is missing or invalid in production: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    cached = {
      name: "default",
      system_prompt: "You are a helpful assistant.",
      fields: [],
      conversation: {
        max_history: 50,
        summarize_after: 20,
        max_context_tokens: 4000,
      },
    };
    return cached;
  }
}
