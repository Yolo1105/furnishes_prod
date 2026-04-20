"use client";

import type { ReactNode } from "react";
import {
  BudgetContent,
  CartContent,
  EvaHeader,
  ProfileContent,
  ReportContent,
  RoomPlannerContent,
  SearchContent,
  StyleContent,
  SummaryUserChoices,
  useSidebar,
  ValidateContent,
} from "@/components/shared/layout/sidebar";
import type { PanelId } from "@/components/shared/layout/sidebar/types";
import { WorkspaceRailChatPanel } from "@/components/site/workspace-rail-chat";

function PanelScroll({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

/**
 * Renders the active workspace drawer body for the marketing rail (signed-in).
 */
export function WorkspacePanelBody() {
  const { activePanel, panelOpen, panelClosing } = useSidebar();
  const visible = panelOpen || panelClosing;

  if (!visible || !activePanel) return null;

  const id = activePanel as PanelId;

  const withHeader = (panelId: PanelId, body: ReactNode) => (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <EvaHeader panelId={panelId} />
      {body}
    </div>
  );

  switch (id) {
    case "chatbot":
      return withHeader("chatbot", <WorkspaceRailChatPanel />);
    case "summary":
      return withHeader(
        "summary",
        <PanelScroll>
          <div className="p-3">
            <SummaryUserChoices />
          </div>
        </PanelScroll>,
      );
    case "search":
      return withHeader(
        "search",
        <PanelScroll>
          <SearchContent />
        </PanelScroll>,
      );
    case "style":
      return withHeader(
        "style",
        <PanelScroll>
          <StyleContent />
        </PanelScroll>,
      );
    case "budget":
      return withHeader(
        "budget",
        <PanelScroll>
          <BudgetContent />
        </PanelScroll>,
      );
    case "room-planner":
      return withHeader(
        "room-planner",
        <PanelScroll>
          <RoomPlannerContent />
        </PanelScroll>,
      );
    case "validate":
      return withHeader(
        "validate",
        <PanelScroll>
          <ValidateContent />
        </PanelScroll>,
      );
    case "report":
      return withHeader(
        "report",
        <PanelScroll>
          <ReportContent />
        </PanelScroll>,
      );
    case "cart":
      return withHeader(
        "cart",
        <PanelScroll>
          <CartContent />
        </PanelScroll>,
      );
    case "profile":
      return withHeader(
        "profile",
        <PanelScroll>
          <ProfileContent />
        </PanelScroll>,
      );
    default:
      return null;
  }
}
