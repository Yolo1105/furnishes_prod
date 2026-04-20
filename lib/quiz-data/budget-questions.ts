import type { CategoryDef, Question } from "./types";

// ─── FLOW 2: BUDGET ───────────────────────────────────────────────────────────

export const BUDGET_CATEGORIES: CategoryDef[] = [
  { id: "seating", label: "SEATING & SOFA" },
  { id: "storage", label: "STORAGE & MEDIA" },
  { id: "rug", label: "RUG & TEXTILES" },
  { id: "lighting", label: "LIGHTING" },
  { id: "decor", label: "DECOR & STYLING" },
];

export const BUDGET_PRIORITY_OPTIONS = [
  { id: "must", label: "MUST HAVE" },
  { id: "important", label: "IMPORTANT" },
  { id: "nice", label: "NICE TO HAVE" },
  { id: "skip", label: "SKIP FOR NOW" },
];

export const BUDGET_SPEND_OPTIONS = [
  { id: "save", label: "SAVE" },
  { id: "balanced", label: "BALANCED" },
  { id: "splurge", label: "SPLURGE" },
];

export const BUDGET_STRICTNESS_OPTIONS = [
  { id: "hard", label: "HARD CAP" },
  { id: "flexible", label: "FLEXIBLE, CAN STRETCH 10 TO 15%" },
  { id: "explore", label: "EXPLORE FIRST AT DIFFERENT PRICE POINTS" },
] as const;

export const BUDGET_QUESTIONS: Question[] = [
  {
    id: "b1",
    flow: "budget",
    section: "BUDGET",
    type: "budget-entry",
    bg: "#1a1714",
    accent: "#DDD5C4",
    question: "YOUR BUDGET",
    subtext: "How would you like to approach this?",
  },
  // b2a: guided q1 — room type
  {
    id: "b2a",
    flow: "budget",
    section: "BUDGET",
    type: "single-select",
    layout: "magazine-spread",
    bg: "#1a1714",
    accent: "#B33D0E",
    question: "ROOM TYPE",
    subtext: "What room are we designing?",
    autoAdvance: true,
    options: [
      { id: "b2a-lr", label: "LIVING ROOM" },
      { id: "b2a-br", label: "BEDROOM" },
      { id: "b2a-ho", label: "HOME OFFICE" },
      { id: "b2a-dr", label: "DINING ROOM" },
      { id: "b2a-st", label: "STUDIO" },
    ],
  },
  // b2b: guided q2 — size
  {
    id: "b2b",
    flow: "budget",
    section: "BUDGET",
    type: "single-select",
    layout: "giant-type-small-options",
    bg: "#1a1714",
    accent: "#B33D0E",
    question: "ROOM SIZE",
    subtext: "Roughly how big is the space?",
    autoAdvance: true,
    options: [
      { id: "b2b-sm", label: "COZY, UNDER 200 SQ FT" },
      { id: "b2b-md", label: "MEDIUM, 200 TO 400 SQ FT" },
      { id: "b2b-lg", label: "SPACIOUS, 400+ SQ FT" },
    ],
  },
  // b2c: guided q3 — starting point
  {
    id: "b2c",
    flow: "budget",
    section: "BUDGET",
    type: "single-select",
    layout: "split-typewriter",
    bg: "#1a1714",
    accent: "#B33D0E",
    question: "STARTING POINT",
    subtext: "Where are you starting from?",
    autoAdvance: true,
    options: [
      { id: "b2c-em", label: "EMPTY ROOM" },
      { id: "b2c-so", label: "HAVE SOME PIECES" },
      { id: "b2c-fw", label: "JUST A FEW ITEMS" },
    ],
  },
  // b2d: guided q4 — duration
  {
    id: "b2d",
    flow: "budget",
    section: "BUDGET",
    type: "single-select",
    layout: "vertical-split",
    bg: "#1a1714",
    accent: "#B33D0E",
    question: "HOW LONG",
    subtext: "How long do you plan to keep this space?",
    autoAdvance: true,
    options: [
      { id: "b2d-sh", label: "1 TO 2 YEARS" },
      { id: "b2d-md", label: "3 TO 5 YEARS" },
      { id: "b2d-lg", label: "5+ YEARS" },
    ],
  },
  // b2e: guided q5 — quality tier
  {
    id: "b2e",
    flow: "budget",
    section: "BUDGET",
    type: "single-select",
    layout: "split-typewriter",
    bg: "#1a1714",
    accent: "#B33D0E",
    question: "QUALITY TIER",
    subtext: "What level of quality are you aiming for?",
    autoAdvance: true,
    options: [
      { id: "b2e-bud", label: "BUDGET FRIENDLY", sublabel: "IKEA / WAYFAIR" },
      { id: "b2e-mid", label: "MID RANGE", sublabel: "WEST ELM / CB2" },
      {
        id: "b2e-hi",
        label: "INVESTMENT PIECES",
        sublabel: "ROOM & BOARD / DWR",
      },
    ],
  },
  // b2f: guided q6 — shopping style
  {
    id: "b2f",
    flow: "budget",
    section: "BUDGET",
    type: "single-select",
    layout: "magazine-spread",
    bg: "#1a1714",
    accent: "#B33D0E",
    question: "SHOPPING STYLE",
    subtext: "How do you prefer to shop?",
    autoAdvance: true,
    options: [
      { id: "b2f-hunt", label: "DEAL HUNTER" },
      { id: "b2f-bal", label: "BALANCED" },
      { id: "b2f-conv", label: "CONVENIENCE FIRST" },
    ],
  },
  // b3: category priorities
  {
    id: "b3",
    flow: "budget",
    section: "BUDGET",
    type: "category-priority",
    bg: "#1a1714",
    accent: "#DDD5C4",
    question: "CATEGORY PRIORITIES",
    subtext: "How important is each category to you?",
    categories: BUDGET_CATEGORIES,
  },
  // b4: category spend
  {
    id: "b4",
    flow: "budget",
    section: "BUDGET",
    type: "category-spend",
    bg: "#1a1714",
    accent: "#B33D0E",
    question: "WHERE TO SPEND & SAVE",
    subtext: "Set your spend level for each category.",
    categories: BUDGET_CATEGORIES,
  },
];
