import type { ComponentType } from "react";

export type PanelId =
  | "summary"
  | "search"
  | "chatbot"
  | "style"
  | "budget"
  | "room-planner"
  | "validate"
  | "report"
  | "cart"
  | "profile";

export type LucideIconType = ComponentType<{
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  className?: string;
}>;

export interface RailButton {
  id: PanelId;
  label: string;
  Icon: LucideIconType;
  route?: string;
  evaHeader?: boolean;
}

export interface RailGroup {
  buttons: RailButton[];
  separator?: boolean;
}

export interface SidebarContextValue {
  railVisible: boolean;
  /** True while panel open — disables pointer-events on rail (rail is covered by panel). */
  railCollapsed: boolean;
  /**
   * True only during the F transition (trigger collapses everything from state 3).
   * Forces ALL rail buttons to opacity:0 with NO CSS transition, preventing any
   * stagger-exit animation from being visible as the panel slides out.
   */
  railInstantHide: boolean;
  panelOpen: boolean;
  /**
   * True while the drawer is sliding closed (`--fur-panel-slide-ms` in `app/globals.css`).
   * Keeps the white surface + `ContentWrapper` margin animation aligned with the panel transform.
   */
  panelClosing: boolean;
  activePanel: PanelId | null;
  contentFading: boolean;
  railDismissing: boolean;
  /**
   * @deprecated Hover + profile controls replaced the header toggle; kept for Eva expand / tests.
   */
  onTriggerClick: () => void;
  onIconClick: (id: PanelId, route?: string) => void;
  openPanel: (id: PanelId) => void;
  expandEva: () => void;
}

// ── STUB: CartContext ──────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant?: string;
}
export interface CartContextValue {
  items: CartItem[];
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

// ── STUB: ProjectContext ───────────────────────────────────────────────────────
export interface StylePack {
  direction: string;
  palette: string[];
  mood?: string;
}
export interface BudgetPlan {
  total: number;
  spent: number;
  currency: string;
}
export interface RoomConfig {
  name?: string;
  width: number;
  length: number;
  height?: number;
  unit: "ft" | "m";
}
export interface ProjectContextValue {
  stylePack: StylePack | null;
  budgetPlan: BudgetPlan | null;
  roomConfig: RoomConfig | null;
  setStylePack: (p: StylePack) => void;
  setBudgetPlan: (p: BudgetPlan) => void;
  setRoomConfig: (c: RoomConfig) => void;
}
