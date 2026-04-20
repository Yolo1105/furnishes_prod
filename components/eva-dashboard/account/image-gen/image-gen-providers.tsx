"use client";

import { EvaToaster } from "@/components/eva/eva-toaster";
import { StudioRailChatProviders } from "@/components/eva-dashboard/chat/studio-rail-chat";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActiveProjectProvider } from "@/lib/eva-dashboard/contexts/active-project-context";

/**
 * Providers scoped to `/account/image-gen` (same role as page-level wrappers on Studio dashboard).
 */
export function ImageGenProviders({ children }: { children: React.ReactNode }) {
  return (
    <ActiveProjectProvider>
      <StudioRailChatProviders>
        <EvaToaster />
        <ToastProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ToastProvider>
      </StudioRailChatProviders>
    </ActiveProjectProvider>
  );
}
