// ─── Core types ──────────────────────────────────────────────────────────────

export type StyleKey =
  | "minimal"
  | "maximalist"
  | "organic"
  | "industrial"
  | "artisan";

export type QuestionType =
  | "single-select" // tap one → auto-advance (or tap + NEXT)
  | "multi-select" // tap multiple → NEXT button
  | "binary-pairs" // 8 rows, each a binary choice
  | "image-grid" // photo cards, single or multi select
  | "palette-cards" // color swatch cards, single → auto-advance
  | "sliders" // multiple range sliders
  | "life-reality" // 3 grouped single-selects on one screen
  | "free-text" // open text input
  | "category-priority" // per-category priority select
  | "category-spend" // per-category spend style
  | "budget-entry" // "know budget" vs "help me figure it out" split
  | "budget-guided" // guided budget questions
  | "grouped-checklist" // grouped checkbox lists
  | "number-input" // numeric input with options
  | "room-size" // presets + manual inputs
  | "openings" // add door/window entries
  | "household-select"; // single select with icons

export type LayoutVariant =
  | "full-color-split"
  | "ghost-type"
  | "scattered-chips"
  | "vertical-split"
  | "offset-composition"
  | "giant-type-small-options"
  | "two-column-grid"
  | "hover-reactive"
  | "editorial-stack"
  | "full-bleed-statement"
  | "magazine-spread"
  | "split-typewriter"
  | "pinboard";

export type FlowId = "style" | "budget" | "room";
export type Section = "STYLE DISCOVERY" | "BUDGET" | "ROOM DETAILS";

/** Which question sets the Style Explorer quiz runs (see `/style`, `/quiz`, `/budget`). */
export type QuizAppMode = "full" | "style" | "budget";

// ─── Answer value shapes ──────────────────────────────────────────────────────

export type SingleAnswer = string;
export type MultiAnswer = string[];
export type BinaryPairsAnswer = Record<string, string>; // pairId → chosen side
export type SlidersAnswer = Record<string, number>; // sliderId → 0–100
export type LifeRealityAnswer = Record<string, string>; // groupId → chosen optionId
export type FreeTextAnswer = string;
export type CategoryPriorityAnswer = Record<string, string>;
export type CategorySpendAnswer = Record<string, string>;
export type BudgetEntryAnswer = {
  path?: "know" | "guided";
  amount?: number;
  strictness?: string;
};
export type BudgetGuidedAnswer = Record<string, string>;
export type NumberInputAnswer = { amount: number; strictness: string };
export type RoomSizeAnswer = {
  preset?: string;
  width?: number;
  length?: number;
  ceiling?: number;
};
export type OpeningsAnswer = Array<{ type: string; wall: string }>;
export type GroupedChecklistAnswer = string[];

export type AnswerValue =
  | SingleAnswer
  | MultiAnswer
  | BinaryPairsAnswer
  | SlidersAnswer
  | LifeRealityAnswer
  | FreeTextAnswer
  | CategoryPriorityAnswer
  | CategorySpendAnswer
  | BudgetEntryAnswer
  | BudgetGuidedAnswer
  | NumberInputAnswer
  | RoomSizeAnswer
  | OpeningsAnswer
  | GroupedChecklistAnswer;

// ─── Question shape ───────────────────────────────────────────────────────────

export interface SliderDef {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
}

export interface BinaryPairDef {
  id: string;
  left: string;
  right: string;
}

export interface LifeRealityGroup {
  id: string;
  label: string;
  options: { id: string; label: string }[];
}

export interface ImageOption {
  id: string;
  label: string;
  sublabel?: string;
  /** Legacy; image grid uses `imageSrc` or a local placeholder instead of Unsplash Source. */
  unsplashQuery?: string;
  imageSrc?: string;
  unsplashId?: string;
  style?: StyleKey;
}

export interface PaletteCard {
  id: string;
  name: string;
  swatches: string[];
  style?: StyleKey;
}

export interface CategoryDef {
  id: string;
  label: string;
}

export interface ChecklistGroup {
  id: string;
  label: string;
  items: { id: string; label: string }[];
}

export interface Question {
  id: string;
  flow: FlowId;
  section: Section;
  type: QuestionType;
  layout?: LayoutVariant;
  bg: string;
  accent: string;
  question: string;
  subtext?: string;
  optional?: boolean;
  autoAdvance?: boolean;
  minSelect?: number;
  maxSelect?: number;
  placeholders?: string[];

  // type-specific data
  options?: Array<{
    id: string;
    label: string;
    sublabel?: string;
    style?: StyleKey;
  }>;
  imageOptions?: ImageOption[];
  binaryPairs?: BinaryPairDef[];
  sliders?: SliderDef[];
  lifeRealityGroups?: LifeRealityGroup[];
  paletteCards?: PaletteCard[];
  categories?: CategoryDef[];
  checklistGroups?: ChecklistGroup[];
}
