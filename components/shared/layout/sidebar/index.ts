// components/shared/layout/sidebar/index.ts
// Barrel export for the Furnishes right sidebar system.

export {
  SidebarProvider,
  useSidebar,
  useSidebarOptional,
} from "./SidebarProvider";
export {
  useWorkspaceRailHover,
  WorkspaceRailHoverProvider,
} from "./workspace-rail-hover";
export type { WorkspaceRailHoverHandlers } from "./workspace-rail-hover";
export { RightSidebar } from "./RightSidebar";
export { AuthModal } from "./AuthModal";
export { EvaHeader } from "./EvaHeader";

// Panel components
export { SummaryUserChoices } from "./panels/SummaryUserChoices";
export { SearchContent } from "./panels/SearchContent";
export { CartContent } from "./panels/CartContent";
export { ProfileContent } from "./panels/ProfileContent";
export { StyleContent } from "./panels/StyleContent";
export { BudgetContent } from "./panels/BudgetContent";
export { RoomPlannerContent } from "./panels/RoomPlannerContent";
export { ValidateContent } from "./panels/ValidateContent";
export { ReportContent } from "./panels/ReportContent";

// Types
export type {
  PanelId,
  RailButton,
  RailGroup,
  SidebarContextValue,
  CartItem,
  CartContextValue,
  StylePack,
  BudgetPlan,
  RoomConfig,
  ProjectContextValue,
} from "./types";
