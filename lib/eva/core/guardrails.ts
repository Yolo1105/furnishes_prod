import { getDomainConfig } from "@/lib/eva/domain/config";
import { getOpenAIKey } from "./openai";
import { log } from "./logger";

function getMaxMessageLength(): number {
  return getDomainConfig().guardrails?.max_message_length ?? 10000;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|above)\s+instructions/i,
  /you\s+are\s+now\s+(a\s+)?(DAN|unrestricted|unfiltered|evil|jailbr)/i,
  /new\s+instructions\s*:/i,
  /^\s*system\s*:\s*/im,
  /\[system\]/i,
  /<\|(im_start|system)\|>/i,
  /^\s*human\s*:\s*/im,
  /^\s*assistant\s*:\s*/im,
  /\bjailbreak\b/i,
  /override\s+(your\s+)?(instructions|rules|programming|guidelines)/i,
  /act\s+as\s+if\s+you\s+(are|were)\s+(a\s+)?(different|new|unrestricted|unfiltered)/i,
  /pretend\s+you\s+(are|have)\s+(no|a\s+different|new)\s+(rules|restrictions|guidelines|instructions|persona)/i,
];

export function checkInjection(message: string): {
  safe: boolean;
  reason?: string;
} {
  if (typeof message !== "string") return { safe: true };
  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(message)) {
      return { safe: false, reason: "Possible prompt injection detected" };
    }
  }
  return { safe: true };
}

export function validateInput(content: string): {
  valid: boolean;
  reason?: string;
} {
  if (typeof content !== "string") {
    return { valid: false, reason: "Invalid message" };
  }
  if (content.length > getMaxMessageLength()) {
    return { valid: false, reason: "Message too long" };
  }
  if (content.trim().length === 0) {
    return { valid: false, reason: "Empty message" };
  }
  const guardrails = getDomainConfig().guardrails;
  if (guardrails?.injection_detection !== false) {
    const inj = checkInjection(content);
    if (!inj.safe) return { valid: false, reason: inj.reason };
  }
  return { valid: true };
}

export async function checkModeration(
  message: string,
): Promise<{ safe: boolean; reason?: string }> {
  const guardrails = getDomainConfig().guardrails;
  if (!guardrails?.moderation_enabled) return { safe: true };
  // The moderation endpoint is OpenAI-only; OpenRouter keys don't work there.
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    if (getOpenAIKey()) {
      // Only an OpenRouter key is available — skip moderation with a warning.
      log({
        level: "warn",
        event: "moderation_skipped",
        detail:
          "Moderation requires OPENAI_API_KEY; only OPENROUTER_API_KEY is set.",
      });
    }
    return { safe: true };
  }
  if (typeof message !== "string" || !message.trim()) {
    return { safe: true };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({ input: message }),
    });
    if (!res.ok) return { safe: true };
    const data = (await res.json()) as {
      results?: Array<{ flagged?: boolean }>;
    };
    const flagged = data.results?.[0]?.flagged === true;
    return flagged
      ? { safe: false, reason: "Content flagged by moderation" }
      : { safe: true };
  } catch {
    return { safe: true };
  }
}

export { sanitizeOutput } from "./output-sanitize";

export function buildSafeSystemPrompt(base: string): string {
  return `${base}

IMPORTANT: You are an interior design assistant ONLY. If the user asks about topics unrelated to design, home improvement, furniture, or decor, politely redirect them back to design topics. Never provide advice on medical, legal, financial, or harmful topics.`;
}
