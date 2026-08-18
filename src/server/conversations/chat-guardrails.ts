/**
 * Input safety for chat sends. Injection checks are local heuristics;
 * moderation optionally calls OpenAI and fails open on transport errors.
 */

const DEFAULT_MAX_MESSAGE_LENGTH = 4000;

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|above)\s+instructions/i,
  /you\s+are\s+now\s+(a\s+)?(DAN|unrestricted|unfiltered|evil|jailbr)/i,
  /new\s+instructions\s*:/i,
  /^\s*system\s*:\s*/im,
  /\[system\]/i,
  /<\|(im_start|system)\|>/i,
  /\bjailbreak\b/i,
  /override\s+(your\s+)?(instructions|rules|programming|guidelines)/i,
  /act\s+as\s+if\s+you\s+(are|were)\s+(a\s+)?(different|new|unrestricted|unfiltered)/i,
  /pretend\s+you\s+(are|have)\s+(no|a\s+different|new)\s+(rules|restrictions|guidelines|instructions|persona)/i,
];

function maxMessageLength(): number {
  const raw = Number(process.env.CHAT_MAX_MESSAGE_LENGTH ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_MESSAGE_LENGTH;
}

export function checkInjection(message: string): {
  safe: boolean;
  reason?: string;
} {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { safe: false, reason: "Possible prompt injection detected" };
    }
  }
  return { safe: true };
}

export function validateChatInput(content: string): {
  valid: boolean;
  reason?: string;
} {
  if (typeof content !== "string") {
    return { valid: false, reason: "Invalid message" };
  }
  if (!content.trim()) {
    return { valid: false, reason: "Empty message" };
  }
  if (content.length > maxMessageLength()) {
    return { valid: false, reason: "Message too long" };
  }
  for (let i = 0; i < content.length; i += 1) {
    const code = content.charCodeAt(i);
    if (
      code <= 0x08 ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f
    ) {
      return { valid: false, reason: "Message contains invalid characters" };
    }
  }
  const injection = checkInjection(content);
  if (!injection.safe) {
    return {
      valid: false,
      ...(injection.reason ? { reason: injection.reason } : {}),
    };
  }
  return { valid: true };
}

export async function checkChatModeration(message: string): Promise<{
  safe: boolean;
  reason?: string;
}> {
  if (process.env.CHAT_MODERATION_ENABLED === "0") {
    return { safe: true };
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || !message.trim()) {
    return { safe: true };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ input: message }),
    });
    if (!response.ok) {
      return { safe: true };
    }
    const payload = (await response.json()) as {
      results?: Array<{ flagged?: boolean }>;
    };
    if (payload.results?.[0]?.flagged) {
      return { safe: false, reason: "Content flagged by moderation" };
    }
    return { safe: true };
  } catch {
    return { safe: true };
  }
}
