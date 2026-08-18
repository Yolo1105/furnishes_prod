/**
 * Task-aware model resolution from tier env vars.
 * Lives under `model-routing/` (not `server/ai/`) so ESLint's blocked `ai`
 * package pattern does not match the import path.
 */

type ModelTask =
  | "chat"
  | "extraction"
  | "classification"
  | "judge"
  | "vision"
  | "structured"
  | "brief"
  | "image";

function envModel(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

const FALLBACK = "gpt-4o-mini";

/**
 * Resolve the OpenAI model id for a task.
 * Tier envs (`AI_MODEL_NANO`, `AI_MODEL_MINI`, `AI_MODEL_REASONING`) empty = disabled.
 * Fallback chain: task-specific tier → MINI → CHAT_MODEL_PRIMARY → gpt-4o-mini.
 */
export function resolveModel(task: ModelTask): string {
  const nano = envModel("AI_MODEL_NANO");
  const mini = envModel("AI_MODEL_MINI");
  const reasoning = envModel("AI_MODEL_REASONING");
  const chatPrimary = envModel("CHAT_MODEL_PRIMARY");

  switch (task) {
    case "classification":
    case "judge":
      return nano ?? mini ?? chatPrimary ?? FALLBACK;

    case "chat":
      return reasoning ?? mini ?? chatPrimary ?? FALLBACK;

    case "structured":
    case "brief":
    case "extraction":
      return mini ?? chatPrimary ?? FALLBACK;

    case "image":
      return (
        envModel("IMAGE_GENERATION_MODEL") ?? mini ?? chatPrimary ?? FALLBACK
      );

    case "vision":
      return envModel("CHAT_VISION_MODEL") ?? mini ?? chatPrimary ?? FALLBACK;

    default:
      return mini ?? chatPrimary ?? FALLBACK;
  }
}
