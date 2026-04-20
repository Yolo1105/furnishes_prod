/**
 * Chat POST entrypoint for `/api/chat`. Delegates to the staged pipeline in
 * `run-chat-post-pipeline.ts` (validation → conversation → grounding → prompt → stream).
 */
export { runChatPostPipeline as handleChatPost } from "./run-chat-post-pipeline";
