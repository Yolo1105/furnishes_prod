"use client";

import { useState } from "react";
import { Loader2, Share2, Star } from "lucide-react";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { cn } from "@/lib/utils";
import {
  CONVERSATION_SHARE_LABEL,
  CONVERSATION_SHARE_UNAVAILABLE_TITLE,
  setConversationSavedState,
} from "@/lib/eva-dashboard/conversation-actions";
import { useConversationShare } from "@/lib/eva-dashboard/use-conversation-share";

/**
 * Center header: save + share. Same behavior as the right sidebar share control.
 */
export function ConversationHeaderActions() {
  const { recents = [], patchRecent } = useAppContext();
  const { conversationId } = useCurrentConversation();
  const { pending: shareLoading, runShare } =
    useConversationShare(conversationId);
  const [saveLoading, setSaveLoading] = useState(false);

  const recentId = conversationId ? `convo-${conversationId}` : null;
  const isSaved =
    recentId != null &&
    recents.find((r) => r.id === recentId)?.isSaved === true;

  const onShare = () => {
    void runShare();
  };

  const onSaveToggle = async () => {
    if (!conversationId || !recentId || saveLoading) return;
    setSaveLoading(true);
    try {
      const result = await setConversationSavedState(conversationId, !isSaved);
      if (result) {
        patchRecent(recentId, {
          isSaved: result.isSaved,
          savedAt: result.savedAt,
        });
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const saveDisabled = !conversationId || saveLoading;
  const shareDisabled = !conversationId || shareLoading;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={saveDisabled}
        onClick={onSaveToggle}
        className={cn(
          "text-muted-foreground hover:text-primary flex h-7 w-7 items-center justify-center rounded transition-all duration-200",
          saveDisabled
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-accent/10 cursor-pointer",
        )}
        title={
          !conversationId
            ? "Save is available after you send a message and this chat is stored on the server."
            : isSaved
              ? "Remove from saved"
              : "Save conversation"
        }
        aria-label={
          !conversationId
            ? "Save unavailable until the conversation is stored"
            : isSaved
              ? "Remove from saved"
              : "Save conversation"
        }
      >
        {saveLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Star
            className={cn(
              "h-3.5 w-3.5",
              isSaved && "fill-primary text-primary",
            )}
          />
        )}
      </button>
      <button
        type="button"
        disabled={shareDisabled}
        onClick={onShare}
        className={cn(
          "text-muted-foreground hover:text-primary flex h-7 w-7 items-center justify-center rounded transition-all duration-200",
          shareDisabled
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-accent/10 cursor-pointer",
        )}
        title={
          !conversationId
            ? CONVERSATION_SHARE_UNAVAILABLE_TITLE
            : CONVERSATION_SHARE_LABEL
        }
        aria-label={
          !conversationId
            ? "Share unavailable until the conversation is stored"
            : CONVERSATION_SHARE_LABEL
        }
      >
        {shareLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Share2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
