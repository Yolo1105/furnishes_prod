/**
 * Shared client actions for conversation share and save — single source of truth for UX.
 */
import { toast } from "sonner";
import { apiPatch, apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";

/** Same label for center header and right sidebar share controls. */
export const CONVERSATION_SHARE_LABEL = "Copy share link";

/** Tooltip when share is unavailable (no persisted conversation yet). Header + sidebar. */
export const CONVERSATION_SHARE_UNAVAILABLE_TITLE =
  "Share is available after your conversation is stored on the server.";

export type ConversationSaveState = {
  isSaved: boolean;
  savedAt: string | null;
};

/**
 * Creates a share link and copies it to the clipboard. Shows toasts on success/failure.
 * @returns true if the link was created and copied (or shown) successfully.
 */
export async function copyShareLinkForConversation(
  conversationId: string,
): Promise<boolean> {
  try {
    const data = await apiPost<{ shareUrl: string }>(
      API_ROUTES.conversationShare(conversationId),
      {},
    );
    if (
      data.shareUrl &&
      typeof navigator !== "undefined" &&
      navigator.clipboard?.writeText
    ) {
      await navigator.clipboard.writeText(data.shareUrl);
      toast.success("Share link copied to clipboard");
    } else {
      toast.success("Share link: " + data.shareUrl);
    }
    return true;
  } catch {
    toast.error("Failed to create share link");
    return false;
  }
}

/**
 * Persists save/unsave for a conversation. Toasts on success and on failure.
 */
export async function setConversationSavedState(
  conversationId: string,
  isSaved: boolean,
): Promise<ConversationSaveState | null> {
  try {
    const data = await apiPatch<ConversationSaveState>(
      API_ROUTES.conversation(conversationId),
      { isSaved },
    );
    toast.success(isSaved ? "Conversation saved" : "Removed from saved");
    return data;
  } catch {
    toast.error("Could not update saved state");
    return null;
  }
}
